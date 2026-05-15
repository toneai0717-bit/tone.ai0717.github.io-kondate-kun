import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { persons, type, ingredients, condition } = await req.json();

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `あなたはアイデア豊富な料理研究家。${persons}人分の${type}を3つ提案してください。

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

定番からひとひねり加えた「いつもと違うけど美味しい」提案をすること。`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

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

    const recipes = [1, 2, 3].map((i) => {
      const match = text.match(
        new RegExp(`<RECIPE${i}>(.*?)</RECIPE${i}>`, "s")
      );
      return match ? parseRecipe(match[1]) : null;
    }).filter(Boolean);

    return NextResponse.json({ recipes });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
