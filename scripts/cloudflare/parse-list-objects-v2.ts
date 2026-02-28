export type ListObjectsV2Parsed = {
  IsTruncated: boolean;
  NextContinuationToken?: string;
  KeyCount?: number;
  MaxKeys?: number;
  contents: Array<{ Key: string; LastModified?: string; ETag?: string; Size?: number }>;
  commonPrefixes?: string[];
};

function getTag(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m?.[1];
}

export function parseListObjectsV2Xml(xml: string): ListObjectsV2Parsed {
  const truncated = (getTag(xml, 'IsTruncated') || '').trim().toLowerCase() === 'true';
  const next = getTag(xml, 'NextContinuationToken')?.trim();
  const KeyCount = (() => {
    const v = getTag(xml, 'KeyCount')?.trim();
    return v ? Number(v) : undefined;
  })();
  const MaxKeys = (() => {
    const v = getTag(xml, 'MaxKeys')?.trim();
    return v ? Number(v) : undefined;
  })();

  const contents: ListObjectsV2Parsed['contents'] = [];
  const re = /<Contents>([\s\S]*?)<\/Contents>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const chunk = m[1];
    const Key = (getTag(chunk, 'Key') || '').trim();
    if (!Key) continue;
    const LastModified = getTag(chunk, 'LastModified')?.trim();
    const ETag = getTag(chunk, 'ETag')?.trim();
    const SizeStr = getTag(chunk, 'Size')?.trim();
    const Size = SizeStr ? Number(SizeStr) : undefined;
    contents.push({ Key, LastModified, ETag, Size });
  }

  // CommonPrefixes when delimiter is used
  const commonPrefixes: string[] = [];
  const pre = /<CommonPrefixes>([\s\S]*?)<\/CommonPrefixes>/g;
  let pm: RegExpExecArray | null;
  while ((pm = pre.exec(xml))) {
    const chunk = pm[1];
    const p = getTag(chunk, 'Prefix')?.trim();
    if (p) commonPrefixes.push(p);
  }

  return {
    IsTruncated: truncated,
    NextContinuationToken: next,
    KeyCount,
    MaxKeys,
    contents,
    commonPrefixes: commonPrefixes.length ? commonPrefixes : undefined,
  };
}
