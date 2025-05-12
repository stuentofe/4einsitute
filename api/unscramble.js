// 파일 경로: /pages/api/generate-order.js

import { buffer } from 'micro';

// 1) Next.js 기본 바디 파싱 비활성화
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // 2) POST 외 요청 차단
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  // 3) raw body 가져와 JSON으로 파싱
  let bodyJson;
  try {
    const raw = await buffer(req);
    bodyJson = JSON.parse(raw.toString('utf-8'));
  } catch (e) {
    console.error('[ERROR] JSON 파싱 실패:', e);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  // 4) 사용자 지문(utterance) 꺼내기
  const passage = bodyJson?.userRequest?.utterance;
  if (!passage || typeof passage !== 'string') {
    return res.status(400).json({ error: 'No passage provided' });
  }

  // 5) 문제 생성 로직
  const sentences = splitParagraphIntoSentences(passage);
  const questions = generateAllOrderQuestions(sentences);
  const combined = questions.join('\n\n');

  // 6) 카카오 템플릿 구조로 응답
  return res.status(200).json({
    version: '2.0',
    template: {
      outputs: [
        {
          simpleText: {
            text: combined,
          },
        },
      ],
    },
  });
}


// ----------------------- Helper Functions -----------------------

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
  let idx = 0;
  for (const size of sizes) {
    result.push(sentences.slice(idx, idx + size).join(' '));
    idx += size;
  }
  return result;
}

function generateSingleOrderQuestion(o, p, q, r) {
  const perms = [
    ['a','c','b'],
    ['b','a','c'],
    ['b','c','a'],
    ['c','a','b'],
    ['c','b','a'],
  ];
  const [la, lb, lc] = perms[Math.floor(Math.random()*perms.length)];
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
  const correct = [reverse[p], reverse[q], reverse[r]].join('');
  const answerKey = { acb:1, bac:2, bca:3, cab:4, cba:5 };
  lines.push(`\n정답:  ${['①','②','③','④','⑤'][answerKey[correct]-1]}`);
  return lines.join('\n');
}

function generateAllOrderQuestions(sentences) {
  i
