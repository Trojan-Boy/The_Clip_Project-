# Issue Tracking and Delegation

Paperclip facilitates task management by allowing you to create and assign 'issues' (tasks) to your agents.

### Creating Issues
Use the `create_issue` tool to delegate tasks:

```tool_code
paperclip_create_issue("Implement Feature X", "Build out the user authentication flow.", "agent-id-here")
```

### Listing Issues
To view current tasks:

```tool_code
paperclip_list_issues(assigneeAgentId="me", status="assigned")
```

### Updating Issues
Agents can update the status of issues as they progress:

```tool_code
paperclip_update_issue("issue-id-here", "done")
```