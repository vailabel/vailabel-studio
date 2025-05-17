---
title: Team Collaboration
description: Learn how to collaborate with your team in Vision AI Label Studio
category: Features
tags: [teams, collaboration, workflow]
lastUpdated: May 17, 2024
---

# Team Collaboration

Vision AI Label Studio provides powerful collaboration features for teams working on annotation projects.

## User Roles and Permissions

The platform supports different user roles:

- **Admin**: Full access to all projects and settings
- **Manager**: Can create and manage projects
- **Annotator**: Can work on assigned tasks
- **Reviewer**: Can review and approve annotations

### Assigning Roles

Assign roles through the team management interface:

```jsx
import { TeamManagement } from "vision-ai-label-studio/team"

;<TeamManagement projectId="your-project-id" defaultRole="annotator" />
```

## Workflow Management

Create custom workflows for your annotation projects:

1. **Setup**: Define labels, instructions, and quality metrics
2. **Annotation**: Team members annotate assigned images
3. **Review**: Reviewers check annotations for quality
4. **Correction**: Annotators address feedback
5. **Approval**: Final approval of annotations

## Task Assignment

Distribute work efficiently among team members:

- Automatic assignment based on workload
- Manual assignment for specialized tasks
- Batch assignment for similar images

Example configuration:

```jsx
import { TaskAssignment } from "vision-ai-label-studio/workflow"

;<TaskAssignment
  strategy="balanced"
  maxTasksPerUser={50}
  priorityField="difficulty"
/>
```

## Real-time Collaboration

Work together in real-time with these features:

- Live updates of annotations
- In-app messaging
- Comment threads on specific annotations
- Activity feed

## Progress Tracking

Monitor project progress with detailed analytics:

- Completion rates by user and category
- Quality metrics and agreement scores
- Time spent on annotations
- Productivity trends

## Next Steps

Learn more about:

- [Quality Assurance](/documentation/quality-assurance)
- [Advanced Features](/documentation/advanced-features)
- [API Integration](/documentation/api-integration)
