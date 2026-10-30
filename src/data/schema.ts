import { z } from 'zod'

export const CATEGORIES = [
  'Games',
  'Learning',
  'Wellbeing',
  'Local (Chelmsford)',
  'Tools',
  '3D & Visual',
  'Parliament',
] as const

export const SiteSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** The deployed site. Absent for projects with no live demo, which show as faded cards. */
  url: z.url().optional(),
  repo: z.string().optional(),
  description: z.string(),
  category: z.string().min(1),
  tags: z.array(z.string()),
  language: z.string().nullable(),
  isPrivateRepo: z.boolean(),
  lastPushed: z.string().nullable(),
  status: z.enum(['live', 'dead']).default('live'),
  thumb: z.string().optional(),
  thumbMode: z.enum(['screenshot', 'generated']).optional(),
  shotWaitFor: z.string().optional(),
  shotClick: z.string().optional(),
  hidden: z.boolean().optional(),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'accent must be a #rrggbb colour')
    .optional(),
})

export const ManifestSchema = z.array(SiteSchema).superRefine((sites, ctx) => {
  const seen = new Set<string>()
  sites.forEach((site, index) => {
    if (seen.has(site.id)) {
      ctx.addIssue({
        code: 'custom',
        path: [index, 'id'],
        message: `duplicate site id "${site.id}"`,
      })
    }
    seen.add(site.id)
  })
})

export type Site = z.infer<typeof SiteSchema>
