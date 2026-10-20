import { S3Client } from '@aws-sdk/client-s3';

let client: S3Client | null = null;

export const BUCKET = process.env.S3_BUCKET || 'taskforge-attachments';

export function getStorage(): { client: S3Client; bucket: string } {
    const accessKeyId = process.env.S3_ACCESS_KEY;
    const secretAccessKey = process.env.S3_SECRET_KEY;

    if (!accessKeyId || !secretAccessKey) {
        throw new Error('Object storage is not configured (set S3_ACCESS_KEY and S3_SECRET_KEY).');
    }

    if (!client) {
        client = new S3Client({
            region: process.env.S3_REGION || 'us-east-1',
            endpoint: process.env.S3_ENDPOINT || 'http://127.0.0.1:9000',
            forcePathStyle: true,
            credentials: { accessKeyId, secretAccessKey },
        });
    }

    return { client, bucket: BUCKET };
}
