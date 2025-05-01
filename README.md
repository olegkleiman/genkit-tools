# Genkit flow with tools. 
This is a simulation of events locator. Provide the area where you want to look for the incoming event, and the simulator backed up with GeminiFlash 2.5 will give you the list.

This demonstrates the Genkit flow (aka Agent) equipped with a tool, i.e. function that could be called manually (if *returnToolRequests* flag is set for *ai.generate()* call) and automatically if it is not set.
In the case of returnToolRequests = true, you get the full flexibility to call the tool in any context with any parameters.

## How to use:
### 1. You might presumable need Genkit CLI. 
Install from [here](https://github.com/firebase/genkit) and check the installation with
```
genkit --version
```
### 2. Create GEMINI_API_KEY
from [here](https://aistudio.google.com/app/apikey)
and create .env file with 
```
GEMINI_API_KEY=<API key>
```


### 3. Build and run the project
```bash
npm i
npm run devui
```
The last script runs Genlit developer UI in browser

### 4. Invoke the flow manually
```
curl --location 'http://localhost:3400/ToolsFlow' \
--header 'Content-Type: application/json' \
--data '{
    "data": "מה האירועים באיזור אלנבי?"
}'
```


