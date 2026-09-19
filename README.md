# Aragon Image Review

Upload headshots, run them through an automated quality pipeline, and see them sorted into
**Accepted** / **Rejected** with the specific reason for any rejection.

## Stack

- **Frontend**: React + TypeScript + Vite, hooks-based state management, no external UI kit
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **Storage**: AWS S3 (works with any S3-compatible service, e.g. MinIO, via `S3_ENDPOINT`)
- **Image processing**: `sharp` (resize/convert/metadata/blur analysis), `heic-convert` (HEIC → JPEG)
- **Face detection**: AWS Rekognition `DetectFaces`

## Architecture

```
Browser ──POST /api/images (multipart)──▶ Express
                                             │
                                             ├─ validate mime/extension (multer fileFilter)
                                             ├─ store original in S3 (incoming/{id}.ext)
                                             ├─ insert Image row, status=PROCESSING
                                             └─ 202 response, fire-and-forget pipeline
                                                       │
                                        ┌──────────────▼───────────────┐
                                        │ runValidationPipeline(id)    │
                                        │  1. HEIC → JPEG if needed    │
                                        │  2. normalize + get metadata │
                                        │  3. size / resolution check  │
                                        │  4. blur check (Laplacian)   │
                                        │  5. dHash + similarity check │
                                        │  6. Rekognition face check   │
                                        │  → update row: ACCEPTED /    │
                                        │    REJECTED + reasons[]      │
                                        └───────────────────────────────┘

Browser polls GET /api/images/:id every ~1.2s while status=PROCESSING,
then renders the image in the Accepted or Rejected column with its reasons.
```

One request per file: the frontend fires an independent upload per selected file, so one
bad file (wrong format, oversized) never blocks the rest of a batch, and each card gets its
own real-time status.

## Validation rules

| # | Rule | Implementation |
|---|------|-----------------|
| 1 | Too small (file size / resolution) | `fileSize < MIN_FILE_SIZE_BYTES` or width/height `< MIN_IMAGE_DIMENSION_PX` |
| 2 | Wrong format | Client-side extension/MIME check for instant feedback + server-side `multer` `fileFilter` (never trust the client) |
| 3 | Too similar to an existing image | `dHash` (difference hash) computed per image; new upload compared via Hamming distance against hashes of previously **accepted** images |
| 4 | Blurry | Variance of the Laplacian of the grayscale image (a standard focus-measure: sharp edges → high variance, blur → low variance) |
| 5 | Face too small | AWS Rekognition `DetectFaces`, reject if the largest face's bounding-box area ratio `< MIN_FACE_AREA_RATIO` |
| 6 | Multiple faces | Reject if `DetectFaces` returns more than one face |

All checks run and every failing reason is collected, so a rejected image shows *all* the
reasons it failed, not just the first one. Thresholds are env-configurable (see
`server/.env.example`).

## Setup

### 1. Database

```bash
# any local/hosted Postgres works
createdb aragon_images
```

### 2. AWS

- Create an S3 bucket.
- Create an IAM user/role with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on that bucket
  and `rekognition:DetectFaces`.
- (Local alternative: point `S3_ENDPOINT` at a MinIO container; Rekognition still needs real AWS
  credentials since it's a managed API.)
- Amazon Rekognition isn't offered in every region (notably not in `eu-north-1`/Stockholm). If
  your bucket's region doesn't support it, set `REKOGNITION_REGION` to one that does (e.g.
  `eu-west-1`) — S3 and Rekognition calls don't need to share a region.

### 3. Server

```bash
cd server
cp .env.example .env   # fill in DATABASE_URL, AWS_*, S3_BUCKET
npm install
npx prisma migrate dev --name init
npm run dev             # http://localhost:4000
```

### 4. Client

```bash
cd client
cp .env.example .env    # VITE_API_BASE_URL
npm install
npm run dev              # http://localhost:5173
```

## API

| Method | Path | Description |
|---|---|---|
| POST | `/api/images` | multipart upload, field `file`; returns `202` with the (processing) record |
| GET | `/api/images?status=&cursor=&limit=` | cursor-paginated list |
| GET | `/api/images/:id` | single record, used for status polling |
| DELETE | `/api/images/:id` | removes DB row + S3 objects |

Preview URLs are short-lived S3 presigned GET URLs generated per-request rather than a public
bucket, so uploads stay private by default.

## Security notes

- Files are validated by MIME type *and* extension server-side (never trust the client), size-
  and count-limited (`multer` limits), and buffered in memory only — never written to local disk.
- S3 objects are private; access is only via presigned, time-limited URLs.
- Uploaded bytes are re-encoded through `sharp` before being served back, which strips embedded
  scripts/metadata that a malformed image file could otherwise carry.
- Database access goes through Prisma's parameterized queries — no raw SQL string building.

## Scaling tradeoffs (what I'd change past a take-home)

- **Job queue**: processing currently runs as an in-process async task right after upload (no
  extra infra to stand up). At real scale this belongs in a durable queue (BullMQ/SQS) with a
  separate worker fleet, so a crashed server doesn't drop in-flight jobs and processing scales
  independently of the API.
- **Similarity search**: the duplicate check scans the 500 most recent accepted hashes in
  application code. That's fine at small scale; past that it wants a proper index — bucket by
  hash prefix, or use `pgvector`/a dedicated ANN index for perceptual-hash lookups.
- **Real-time updates**: the client polls every ~1.2s, which is simple and robust through any
  proxy. SSE or WebSockets would cut latency and request volume at higher traffic.
- **Uploads**: files currently go through the API server. At scale, issuing presigned S3 PUT
  URLs and uploading directly from the browser would remove the API as a bandwidth bottleneck.

## Repository layout

```
server/   Express API, Prisma schema, validation pipeline
client/   React app
```
