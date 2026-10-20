import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const skills = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/skills' }),
  schema: z.object({
    skill: z.string(),
    title: z.string(),
    line: z.string(),
    writes: z.string(),
    order: z.number(),
    core: z.boolean().default(false),
    guideOrder: z.number(),
    does: z.string(),
    see: z.string(),
    needs: z.string().default(''),
    tweaks: z.array(z.object({ line: z.string(), result: z.string() })),
  }),
});

export const collections = { skills };
