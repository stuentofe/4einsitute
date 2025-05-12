// 파일 경로: /pages/api/generate-order.js

import { buffer } from 'micro';

// Next.js API 라우트에서 raw body 읽기 위해 bodyParser 비활성화
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // POST 이외의 메서드 차단
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  // raw body 파싱
  let bodyJson;
  try {
    const raw = await buffer(req);
    bodyJson = JSON.parse(raw.toString('utf-8'));
  } catch (e) {
    console.error('[ERROR] JSON 파싱 실패', e);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // 카카오 요청 구조에서 사용자 발화 추출
  const passage = bodyJson?.userRequest?.utterance?.trim();
  if (!passage) {
    return res.status(400).json({ error: 'No passage provided' });
  }

  // ----------------------------------------------------------------
  // 여기부터는 로컬 JS 로직 그대로 가져옴
  // ----------------------------------------------------------------

  function splitParagraphIntoSentences(text) {
    return (
      text
        .replace(/\r?\n/g, ' ')
        .match(/[^.!?]+[.!?]+/g)
        ?.map((s) => s.trim()) || []
    );
  }

  function getValid4ChunkCombinations(n) {
    const result = [];
    function dfs(current, sum) {
      if (current.length === 4) {
        if (sum === n) result.push([...current]);
        return;
      }
      const maxChunkSize = n >= 9 ? 3 : 2;
      for (let i = 1; i <= maxChunkSize; i++) {
        if (sum + i <= n) {
          current.push(i);
          dfs(current, sum + i);
          current.pop();
        }
      }
    }
    dfs([], 0);
    return result;
  }

  function chunkSentences(sentences, sizes) {
    const result = [];
    let index = 0;
    for (const size of sizes) {
      result.push(sentences.slice(index, index + size).join(' '));
      index += size;
    }
    return result;
  }

  function generateSingleOrderQuestion(o, p, q, r) {
    const perms = [
      ['a','c','b'], ['b','a','c'], ['b','c','a'],
      ['c','a','b'], ['c','b','a']
    ];
    const [la, lb, lc] = perms[Math.floor(Math.random() * perms.length)];

    const labels = { [la]: p, [lb]: q, [lc]: r };
    const reverse = { [p]: la, [q]: lb, [r]: lc };

    const lines = [];
    lines.push('주어진 글 다음에 이어질 글의 흐름으로 가장 적절한 것은?\n');
    lines.push(o + '\n');
    lines.push(`(A) ${labels.a}`);
    lines.push(`(B) ${labels.b}`);
    lines.push(`(C) ${labels.c}\n`);
    lines.push('① (A) - (C) - (B)');
    lines.push('② (B) - (A) - (C)');
    lines.push('③ (B) - (C) - (A)');
    lines.push('④ (C) - (A) - (B)');
    lines.push('⑤ (C) - (B) - (A)');

    const correctLabel = [reverse[p], reverse[q], reverse[r]].join('');
    const answerKey = { acb:1, bac:2, bca:3, cab:4, cba:5 };
    const circled = ['①','②','③','④','⑤'];
    lines.push(`\n정답: ${circled[answerKey[correctLabel] - 1]}`);

    return lines.join('\n');
  }

  function generateAllOrderQuestions(sentences) {
    if (sentences.length < 4) {
      return ['문장 수 부족: 최소 4문장 이상 입력해주세요.'];
    }
    const results = [];
    const combos = getValid4ChunkCombinations(sentences.length);
    for (const sizes of combos) {
      const [o, p, q, r] = chunkSentences(sentences, sizes);
      results.push(generateSingleOrderQuestion(o, p, q, r));
    }
    return results;
  }

  // 문제 생성
  const sentences = splitParagraphIntoSentences(passage);
  const questions = generateAllOrderQuestions(sentences);
  const combined = questions.map((q, i) => `${i+1}.\n${q}`).join('\n\n');

  // ----------------------------------------------------------------
  // 카카오톡 템플릿 JSON 포맷으로 응답
  // ----------------------------------------------------------------
  return res.status(200).json({
    version: '2.0',
    template: {
      outputs: [
        {
          simpleText: {
            text: combined
          }
        }
      ]
    }
  });
}
