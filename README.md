# Genkit flow with tools

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
    "data": "List the events in Dubai?"
}'
```


