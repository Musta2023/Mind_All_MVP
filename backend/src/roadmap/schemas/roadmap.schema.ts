export const RoadmapSchema = {
  summary: 'string (max 500 chars)',
  objectives: [
    {
      title: 'string',
      why: 'string (why this matters)',
      success_metric: 'string (measurable outcome)',
    },
  ],
  initiatives: [
    {
      title: 'string',
      deadline: 'YYYY-MM-DD',
      tasks: [
        {
          title: 'string',
          owner: 'string (optional)',
          effort: 'low | medium | high (optional)',
        },
      ],
    },
  ],
};

export function validateRoadmap(data: any): boolean {
  if (!data.summary || typeof data.summary !== 'string') return false;
  if (!Array.isArray(data.objectives) || data.objectives.length < 2)
    return false;
  if (!Array.isArray(data.initiatives) || data.initiatives.length < 3)
    return false;

  for (const obj of data.objectives) {
    if (
      !obj.title ||
      !obj.why ||
      !obj.success_metric ||
      typeof obj.title !== 'string'
    )
      return false;
  }

  for (const init of data.initiatives) {
    if (!init.title || !init.deadline || !Array.isArray(init.tasks))
      return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(init.deadline)) return false;
    if (init.tasks.length === 0) return false;
    for (const task of init.tasks) {
      if (!task.title || typeof task.title !== 'string') return false;
    }
  }

  return true;
}
