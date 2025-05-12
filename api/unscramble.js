export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  // 카카오 기본 구조에서 사용자 발화 꺼내기
  const passage = req.body.userRequest?.utterance || "";
  const sentences = splitParagraphIntoSentences(passage);
  const questions = generateAllOrderQuestions(sentences);

  // 배열을 하나의 문자열로 합치기
  const combinedQuestions = questions.join("\n\n");

  // 카카오톡 응답 형식에 맞게 응답
  return res.status(200).json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text: combinedQuestions
          }
        }
      ]
    }
  });
}

// ----------------------- Helper Functions -----------------------

function splitParagraphIntoSentences(text) {
  return text
    .replace(/\r?\n/g, " ")
    .match(/[^.!?]+[.!?]+/g)
    ?.map((s) => s.trim()) || [];
}

function getValid4ChunkCombinations(n) {
  const result = [];
  function dfs(current, sum) {
    if (current.length === 4) {
      if (sum === n) result.push([...current]);
      return;
    }
    const maxChunkSize
