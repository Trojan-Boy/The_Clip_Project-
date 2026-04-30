# Agent Management in Paperclip

Paperclip allows you to hire, configure, and monitor various AI agents to perform different roles within your organization.

### Hiring Agents
Use the `hire_agent` tool to create new agents:

```tool_code
paperclip_hire_agent("Engineer", "engineer", "Software Engineer", "code", "Your capabilities here.")
```

### Listing Agents
To see all active agents:

```tool_code
paperclip_list_agents()
```

### Agent Roles and Capabilities
Each agent is defined by its role and a set of capabilities that dictate its responsibilities and potential actions.