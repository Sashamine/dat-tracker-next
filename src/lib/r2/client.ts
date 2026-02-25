import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function required(name: string, val?: string): string {
  if (!val) throw new Error(`Missing ${name}`);
  return val;
}

export function getR2Config() {
  const endpoint = required('R2_ENDPOINT', process.env.R2_ENDPOINT);
  const region = process.env.R2_REGION || 'auto';
  const accessKeyId = required('R2_ACCESS_KEY_ID', process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = required('R2_SECRET_ACCESS_KEY', process.env.R2_SECRET_ACCESS_KEY);
  const bucket = required('R2_BUCKET', process.env.R2_BUCKET);
  return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

export function makeR2Client() {
  const { endpoint, region, accessKeyId, secretAccessKey } = getR2Config();
  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function r2PutObject(params: {
  key: string;
  body: Uint8Array;
  contentType?: string;
}): Promise<{ bucket: string; key: string }> {
  const { bucket } = getR2Config();
  const s3 = makeR2Client();

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  );

  return { bucket, key: params.key };
}
