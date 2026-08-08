

1. Microsoft Foundry - https://ai.azure.com/
    - Can also create from the portal. 


1. Created a project called `rchynoweth-hello-demo`
    - RG: `rg-ai-foundry`
    - Resource: `rchynoweth-hello-demo-resource`


1. Agent and demo [walkthrough](https://learn.microsoft.com/en-us/azure/ai-foundry/quickstarts/get-started-code).


1. Libraries to install in Python.  
    ```
    pip install azure-ai-projects --pre
    pip install openai azure-identity python-dotenv
    ```


1. Deploy as an [application](https://github.com/azure-ai-foundry/foundry-agent-webapp).  
    - There is a way to preview the code and test it through the browser. 



Other notes: 
- There is an MCP connection to Azure Databricks Genie which would allow agents to query data. 
- Other MCP servers too but not Fabric. 



Highlights from the docs:
- Multi-Agent Orchestration and Workflows – Build advanced automation using SDKs for C# and Python that enable collaborative agent behavior and complex workflow execution.
- Expanded Integration Options – Publish agents to Microsoft 365, Teams, and BizChat, plus leverage **containerized deployments** for greater portability.
- Expanded Tool Access – Access the Foundry tool catalog (preview) with a public tool catalog and your own private catalogs, connecting over 1,400 tools in Microsoft Foundry.
- Enhanced Memory Capabilities – Use memory to help your agent retain and recall contextual information across interactions. Memory maintains continuity, adapts to user needs, and delivers tailored experiences without requiring repeated input.
- Knowledge Integration – Connect your agent to a Foundry IQ (powered by Azure AI Search) knowledge base to ground responses in **enterprise** or **web content**. This integration provides reliable, **citation-backed answers** for multi-turn conversations.
- Real-Time Observability – Monitor performance and governance using built-in metrics and model tracking tools.
- Enhanced Enterprise Support – Use open protocols in Foundry Agent Service with full authentication support in MCP and A2A tool, AI gateway integration, and Azure Policy integration.
- Centralized AI asset management - Observe, optimize, and manage 100% of your AI assets (agents, models, tools) in one place, the Operate section. - Register agents from other clouds, get alerts when an agent or model requires your attention, and effectively manage your AI fleet health as that fleet scales.




Engagement Details:  
- Set documentation in common repository 
- Potentially leverage a vector index
- Provide citation to results
- Fine-tune a model using documentation 
- We will want to collect Q & A for evaluation. 
    - User feedback is important. 
    - Preloading the Q&A is important for the customers to help curate the dataset. We did this with the lawyer NLP stuff I did
- Document each step / workstream for the engagement
    - Good image and information - https://learn.microsoft.com/en-us/azure/ai-foundry/agents/overview?view=foundry
    - Dev Cycle - https://learn.microsoft.com/en-us/azure/ai-foundry/agents/concepts/development-lifecycle?view=foundry

```
SharePoint / OneDrive / File Share
        ↓
Fabric Pipeline
  - Convert DOCX/PPTX → PDF
  - PDF → Markdown (Document Intelligence)
  - Clean + chunk
  - Bundle by topic (≤20MB)
        ↓
Fabric Notebook
  - Generate Q&A from bundles (LLM calls)
  - Critic pass
  - Deduplicate
  - Output train.jsonl / val.jsonl
        ↓
Azure Blob Storage / Fabric Lakehouse
        ↓
Azure AI Foundry
  - Import dataset
  - Fine-tune model
  - Deploy
  - Attach to Agent
  - RAG + Search (possibily with built-in SharePoint integration )
```