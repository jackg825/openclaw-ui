const PREFIX = 'signaling/';

function prefixed(key: string): string {
  return PREFIX + key;
}

export async function putSignaling(
  bucket: R2Bucket,
  key: string,
  data: unknown,
): Promise<void> {
  await bucket.put(prefixed(key), JSON.stringify(data));
}

export async function getSignaling<T>(
  bucket: R2Bucket,
  key: string,
): Promise<T | null> {
  const obj = await bucket.get(prefixed(key));
  if (!obj) return null;
  const text = await obj.text();
  return JSON.parse(text) as T;
}

export async function appendSignaling(
  bucket: R2Bucket,
  key: string,
  item: unknown,
): Promise<void> {
  const existing = await getSignaling<unknown[]>(bucket, key);
  const list = existing ?? [];
  list.push(item);
  await putSignaling(bucket, key, list);
}

export async function deleteSignaling(
  bucket: R2Bucket,
  key: string,
): Promise<void> {
  await bucket.delete(prefixed(key));
}
