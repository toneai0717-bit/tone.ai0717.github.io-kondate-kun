import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const extractTag = (xml: string, tag: string) => {
  const match = xml.match(new RegExp(`<${tag}>(.*?)<\\/${tag}>`, "s"));
  return match ? match[1].trim() : "";
};

const parseRecipe = (block: string) => ({
  name: extractTag(block, "NAME"),
  time: extractTag(block, "TIME"),
  cal: extractTag(block, "CAL"),
  wash: extractTag(block, "WASH"),
  materials: extractTag(block, "MATERIALS"),
  steps: extractTag(block, "STEPS"),
});

export async function POST(req: NextRequest) {
  const { persons, type, ingredients, condition } = await req.json();

  const prompt = `あなたはアイデア豊富な料理研究家。${persons}人分の${type}を3つ提案してください。

食材：${ingredients || "指定なし"}
こだわり：${condition}

以下のXMLタグで3つ分出力してください。余計な説明は不要。

<RECIPE1>
<NAME>料理名</NAME>
<TIME>調理時間（例：15分）</TIME>
<CAL>カロリー（例：450kcal）</CAL>
<WASH>洗い物の少なさ（★★★〜★☆☆）</WASH>
<MATERIALS>${persons}人分の材料を具体的な分量（g、個、大さじ）で</MATERIALS>
<STEPS>手順を3ステップ以内で簡潔に</STEPS>
</RECIPE1>

<RECIPE2>
<NAME>料理名</NAME>
<TIME>調理時間</TIME>
<CAL>カロリー</CAL>
<WASH>洗い物の少なさ</WASH>
<MATERIALS>材料と分量</MATERIALS>
<STEPS>手順</STEPS>
</RECIPE2>

<RECIPE3>
<NAME>料理名</NAME>
<TIME>調理時間</TIME>
<CAL>カロリー</CAL>
<WASH>洗い物の少なさ</WASH>
<MATERIALS>材料と分量</MATERIALS>
<STEPS>手順</STEPS>
</RECIPE3>

定番からひとひねり加えた「いつもと違うけど美味しい」提案をすること。`;

  const encoder = new TextEncoder();
  const sentRecipes = new Set<number>();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        let buffer = "";

        const stream = await client.messages.stream({
          model: "claude-haiku-4-5",
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        });

        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            buffer += chunk.delta.text;

            for (let i = 1; i <= 3; i++) {
              if (sentRecipes.has(i)) continue;
              const match = buffer.match(
                new RegExp(`<RECIPE${i}>(.*?)</RECIPE${i}>`, "s")
              );
              if (match) {
                const recipe = parseRecipe(match[1]);
                const payload = JSON.stringify({ index: i - 1, recipe });
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                sentRecipes.add(i);
              }
            }
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        const err = JSON.stringify({ error: String(e) });
        controller.enqueue(encoder.encode(`data: ${err}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginxのバッファリング無効化
    },
  });
}
