import { genkit, z, ToolResponsePart } from 'genkit/beta';
import { googleAI, gemini25FlashPreview0417 } from '@genkit-ai/googleai';
import { startFlowServer } from '@genkit-ai/express';
import dotenv from 'dotenv';
dotenv.config();

googleAI({ apiKey: process.env.GOOGLE_API_KEY });
const ai = genkit({
    plugins: [googleAI()],
    model: gemini25FlashPreview0417
});

const getWeather = ai.defineTool(
    {
        name: "weatherTool",
        description: 'Gets the current weather in a given location',
        inputSchema: z.object({ 
          location: z.string().describe('The location to get the current weather for')
        }),
        outputSchema: z.string()
    },
    async (input) => {
        console.log('Input:', input);
        return `The current weather in ${input.location} is 63°F and sunny.`;
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
        inputSchema: z.string()
    },
    async (input: string) => {

        const generateOptions = {
            tools: [getWeather, getEvents],
            returnToolRequests: true, // Explicitly handling tool calls
            prompt: `Question: ${input}`            
        }

        // generate a response
        const llmResponse =  await ai.generate(generateOptions);
        const toolRequests = llmResponse.toolRequests;
        if( toolRequests.length == 0 ) {
            console.log("No tool requests found in the initial response.");
            return llmResponse;
        }

        console.log("Tool requests: ", toolRequests);
        const toolResponseParts: ToolResponsePart[] = await Promise.all(
            toolRequests.map( async (toolRequestPart) => {
                const toolRequest = toolRequestPart.toolRequest;

                let output : any = "";
                if( toolRequest.name === "weatherTool" ) {
                    output = await getWeather.run(toolRequest.input as { location: string });
                } else if( toolRequest.name === "eventsTool" ) {
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
            // model: gemini25FlashPreview0417,
            tools: [getWeather, getEvents], // Still need to provide tools for context 
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