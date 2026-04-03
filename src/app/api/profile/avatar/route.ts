import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { db, users } from '@/db';
import { eq } from 'drizzle-orm';

// POST /api/profile/avatar
// Accepts multipart/form-data with a `file` field
// Uploads to R2 and saves the public URL to users.avatarUrl
export async function POST(req: NextRequest) {
  const auth = withAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  // Check R2 is configured
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    R2_PUBLIC_URL,
  } = process.env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    return NextResponse.json(
      { error: 'Profile picture upload is not configured yet.' },
      { status: 503 }
    );
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  // Validate file type
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return NextResponse.json(
      { error: 'Only JPEG, PNG, and WebP images are supported.' },
      { status: 400 }
    );
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 5MB.' }, { status: 400 });
  }

  try {
    const ext = file.type.split('/')[1];
    const key = `avatars/${user.userId}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    // Use AWS Signature v4 signing
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    await s3.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
    }));

    const avatarUrl = `${R2_PUBLIC_URL}/${key}`;

    await db.update(users).set({ avatarUrl }).where(eq(users.id, user.userId));

    return NextResponse.json({ data: { avatarUrl } });
  } catch (err) {
    console.error('[avatar upload]', err);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
