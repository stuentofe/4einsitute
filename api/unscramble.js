// /pages/api/unscramble.js

export default function handler(req, res) {
  try {
    // 1) GET 헬스체크
    if (req.method === 'GET') {
      return res.status(200).json({ ok: true });
    }

    // 2) POST 요청만 처리
    if (req.method === 'POST') {
      const { userRequest } = req.body;           // Next.js가 JSON body를 자동 파싱
      const passage = userRequest?.utterance?.trim();

      if (!passage) {
        return res.status(400).json({ error: 'No utterance provided' });
      }

      // --- 문제 생성 로직 (로컬 JS 코드 그대로) ---
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
        function dfs(cur, sum) {
          if (cur.length === 4) {
            if (sum === n) result.push([...cur]);
            return;
          }
          const maxSize = n >= 9 ? 3 : 2;
          for (let i = 1; i <= maxSize; i++) {
            if (sum + i <= n) {
              cur.push(i);
              dfs(cur, sum + i);
              cur.pop();
            }
          }
        }
        dfs([], 0);
        return result;
      }
      function chunkSentences(sentences, sizes) {
        const out = [];
        let idx = 0;
        for (const sz of sizes) {
          out.push(sentences.slice(idx, idx + sz).join(' '));
          idx += sz;
        }
        return out;
      }
      function generateSingleOrderQuestion(o, p, q, r) {
        const perms = [
          ['a','c','b'], ['b','a','c'], ['b','c','a'],
          ['c','a','b'], ['c','b','a']
        ];
        const [la, lb, lc] = perms[Math.floor(Math.random() * perms.length)];
        const labels = { [la]: p, [lb]: q, [lc]: r };
        const rev = { [p]: la, [q]: lb, [r]: lc };
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
        const key = [rev[p], rev[q], rev[r]].join('');
        const ansMap = { acb:1, bac:2, bca:3, cab:4, cba:5 };
        lines.push(`\n정답: ${['①','②','③','④','⑤'][ansMap[key]-1]}`);
        return lines.join('\n');
      }
      function generateAllOrderQuestions(sentences) {
        if (sentences.length < 4) {
          return ['문장 수 부족: 최소 4문장 이상 입력해주세요.'];
        }
        const out = [];
        for (const sizes of getValid4ChunkCombinations(sentences.length)) {
          const [o,p,q,r] = chunkSentences(sentences, sizes);
          out.push(generateSingleOrderQuestion(o,p,q,r));
        }
        return out;
      }
      // --- 로직 적용 끝 ---

      const sentences = splitParagraphIntoSentences(passage);
      const questions = generateAllOrderQuestions(sentences);
      const text = questions.map((q, i) => `${i+1}.\n${q}`).join('\n\n');

      // 3) 카카오톡 템플릿 응답
      return res.status(200).json({
        version: '2.0',
        template: {
          outputs: [
            { simpleText: { text } }
          ]
        }
      });
    }

    // 그 외 메서드는 405
    res.setHeader('Allow', ['GET','POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (err) {
    console.error('[UNSCRAMBLE ERROR]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
