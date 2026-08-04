# Cosmic Tech commerce operations patch

Upload the contents of this extracted folder to the root of the existing `ecom-platform` GitHub repository. Do not create new Vercel projects.

Read `UPDATE_EXISTING_DEPLOYMENT.md` before committing. After uploading, manually delete the files listed in `DELETE_THESE_FILES.txt` from the existing repository because GitHub web uploads cannot delete old files.

The backend deployment applies the additive Prisma migration `202608040002_tech_commerce_operations`.
