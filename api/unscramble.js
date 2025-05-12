import { buffer } from 'micro';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  // 1) raw body 파싱
  let bodyJson;
  try {
    const raw = await buffer(req);
    bodyJson = JSON.parse(raw.toString('utf-8'));
  } catch (e) {
    console.error('[DEBUG] JSON 파싱 에러', e);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // 2) 디버그용: 들어온 JSON 그대로 돌려주기
  return res.status(200).json({
    version: '2.0',
    template: {
      outputs: [
        {
          simpleText: {
            text: JSON.stringify(bodyJson, null, 2)
          }
        }
      ]
    }
  });
}
