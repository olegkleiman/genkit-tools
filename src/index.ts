import { genkit, z, ToolResponsePart, GenerateResponse } from 'genkit/beta';
import { googleAI, gemini25FlashPreview0417 } from '@genkit-ai/googleai';
import { startFlowServer } from '@genkit-ai/express';
import dotenv from 'dotenv';
dotenv.config();

googleAI({ apiKey: process.env.GOOGLE_API_KEY });
const ai = genkit({
    plugins: [googleAI()],
    model: gemini25FlashPreview0417
});

// Define a type for the interrupt request details to be returned
const InterruptRequestSchema = z.object({
    name: z.string(),
    input: z.any(),
    ref: z.string().optional()
});

// Define a type for the flow's output, which can be a final response or an interrupt request
const FlowOutputSchema = z.object({ // Signal that an interrupt occurred
    status: z.literal('INTERRUPT'),
    interrupt: InterruptRequestSchema
})

const askQuestion = ai.defineInterrupt(
    {
        name: "askQuestion",
        description: 'Asks a question to narrow the area of interest',
        inputSchema: z.object({
            choices: z.array(z.string()).describe('the choices to display to the user'),
            allowOther: z.boolean().optional().describe('when true, allow write-ins')
        }),
        outputSchema: z.string() // The user's answer
    }
);

const getEvents = ai.defineTool(
    {
        name: "eventsTool",
        description: 'Gets the current events in a given location',
        inputSchema: z.object({ 
          location: z.string().describe('The location to get the current events for')
        }),
        outputSchema: z.string()
    },
    async (input) => {
        console.log('Input:', input);
        return "List of events in " + input.location + ":\n Event 1\n, Event 2\n, Event 3.";
    }
);

export const ToolsFlow =  ai.defineFlow(
    {
        name: "ToolsFlow",
        inputSchema: z.string(),
        // outputSchema: FlowOutputSchema
    },
    async (flowInput) => {

        const generateOptions = {
            tools: [getEvents, askQuestion],
            returnToolRequests: true, // Explicitly handling tool calls
            prompt: `Your goal is to provide event information using 'eventsTool'. If the user's request is ambiguous or too broad (e.g., 'events nearby'), you MUST use the 'askQuestion' tool to ask for clarification of the neighborhood in Tel-Aviv city. Do NOT ask clarifying questions directly in your text response; use the 'askQuestion' tool structure. Answer in Hebrew. User's initial question: ${flowInput}`,
            //prompt: `Question: ${input}`            
        }

        // generate a response
        const llmResponse =  await ai.generate(generateOptions);
        const toolRequests = llmResponse.toolRequests;
        if( toolRequests.length == 0 ) {
            console.log("No tool requests found in the initial response.");
            return llmResponse;
        }

        console.log("Tool requests: ", toolRequests);

        // Check specifically for the interrupt
        const interruptPart = toolRequests.find( part => part.toolRequest.name === "askQuestion" );
        if( interruptPart ) {
            const interruptRequest = interruptPart.toolRequest;
            // *** PAUSE POINT ***

            return {
                toolResponse: {
                    name: interruptRequest, // "INTERRUPT",
                    ref: interruptRequest.ref,
                    input: interruptRequest.input,
                }
            }
        }

        const toolResponseParts: ToolResponsePart[] = await Promise.all(
            toolRequests.map( async (toolRequestPart) => {
                const toolRequest = toolRequestPart.toolRequest;

                let output : any = "";
                if( toolRequest.name === "eventsTool" ) {
                    output = await getEvents.run(toolRequest.input as { location: string });
                } 

                console.log(`Executing tool: ${toolRequest.name} with input: ${JSON.stringify(toolRequest.input)}. Output: ${output}`);
                // Construct the ToolResponsePart object
                return { 
                    toolResponse: { 
                            name: toolRequest.name,                     
                            ref: toolRequest.ref,
                            output: output
                        },
                    }
            })
        )

        const finalResponse = await ai.generate({
            tools: [getEvents, askQuestion],// Still need to provide tools for context 
                                            // because to correctly interpret the role 'tool' for the added message.  
            messages: [
                ...llmResponse.messages, // Includes user prompt and model's tool request message
                { role: 'tool', content: toolResponseParts } // Pass the correctly formatted ToolResponsePart array
            ]
        });

        return finalResponse;
    }
)

startFlowServer({
    flows: [ToolsFlow],
    port: 3400,
});