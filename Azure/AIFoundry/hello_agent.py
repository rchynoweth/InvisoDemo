import os
from dotenv import load_dotenv
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import PromptAgentDefinition

load_dotenv("Azure/AIFoundry/.env")


#####
### Create the Agent
#####

project_client = AIProjectClient(
    endpoint=os.environ["AZURE_AI_FOUNDRY_PROJECT_ENDPOINT"],
    credential=DefaultAzureCredential(),
)

agent = project_client.agents.create_version(
    agent_name=os.environ["AZURE_AI_FOUNDRY_AGENT_NAME"],
    definition=PromptAgentDefinition(
        model=os.environ["AZURE_AI_FOUNDRY_MODEL_DEPLOYMENT_NAME"],
        instructions="You are a helpful assistant that answers general questions",
    ),
)
print(f"Agent created (id: {agent.id}, name: {agent.name}, version: {agent.version})")

#####
### Chat with the Agent
#####

project_client = AIProjectClient(
    endpoint=os.environ["AZURE_AI_FOUNDRY_PROJECT_ENDPOINT"],
    credential=DefaultAzureCredential(),
)

agent_name = os.environ["AZURE_AI_FOUNDRY_AGENT_NAME"]
openai_client = project_client.get_openai_client()

# Optional Step: Create a conversation to use with the agent
conversation = openai_client.conversations.create()
print(f"Created conversation (id: {conversation.id})")

# Chat with the agent to answer questions
response = openai_client.responses.create(
    conversation=conversation.id, #Optional conversation context for multi-turn
    extra_body={"agent": {"name": agent_name, "type": "agent_reference"}},
    input="What is the size of France in square miles?",
)
print(f"Response output: {response.output_text}")

# Optional Step: Ask a follow-up question in the same conversation
response = openai_client.responses.create(
    conversation=conversation.id,
    extra_body={"agent": {"name": agent_name, "type": "agent_reference"}},
    input="And what is the capital city?",
)
print(f"Response output: {response.output_text}")