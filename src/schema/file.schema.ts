import { z } from 'zod';

export const createFolderSchema = z.object({
  name: z.string(),
  parentFolderId: z.number().optional()
});
