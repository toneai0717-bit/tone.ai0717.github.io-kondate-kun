"use client";

import { useState } from "react";

interface Recipe {
  name: string;
  time: string;
  cal: string;
  wash: string;
  materials: string;
  steps: string;
}

const INGREDIENTS = [
  { emoji: "🐷", label: "豚肉" },
  { emoji: "🍗", label: "鶏肉" },
  { emoji: "🐂", label: "牛肉" },
  { emoji: "🥡", label: "ひき肉" },
  { emoji: "🐟", label: "鮭" },
  { emoji: "🍱", label: "白身魚" },
  { emoji: "🥓", label: "ベーコン" },
  { emoji: "🌭", label: "ソーセージ" },
  { emoji: "🧅", label: "玉ねぎ" },
  { emoji: "🥕", label: "にんじん" },
  { emoji: "🥬", label: "キャベツ" },
  { emoji: "🥔", label: "じゃがいも" },
  { emoji: "🥗", label: "白菜" },
  { emoji: "🍆", label: "なす" },
  { emoji: "🫑", label: "ピーマン" },
  { emoji: "🥦", label: "ブロッコリー" },
  { emoji: "🥬", label: "ほうれん草" },
  { emoji: "🍄", label: "きのこ" },
  { emoji: "🍅", label: "トマト" },
  { emoji: "🥚", label: "たまご" },
  { emoji: "⬜", label: "豆腐" },
  { emoji: "🧀", label: "チーズ" },
  { emoji: "🥫", label: "ツナ缶" },
  { emoji: "🍝", label: "パスタ" },
];

const CONDITIONS = [
  { value: "洗い物最小限の爆速レシピ", label: "✨ 時短・楽ちん" },
  { value: "500kcal以内のヘルシーな料理", label: "🌿 ヘルシー" },
  { value: "ビールに合うガッツリおつまみ", label: "🍺 ガッツリおつまみ" },
  { value: "子どもが喜ぶ味付け", label: "🧒 子ども優先" },
  { value: "冷蔵庫一掃レシピ", label: "♻️ 冷蔵庫を空にしたい" },
];

export default function Home() {
  const [persons, setPersons] = useState(2);
  const [type, setType] = useState("主菜（メインおかず）");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [extraIngredients, setExtraIngredients] = useState("");
  const [condition, setCondition] = useState(CONDITIONS[0].value);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [favorites, setFavorites] = useState<Recipe[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("kondate_favs") || "[]");
    } catch {
      return [];
    }
  });

  const toggleChip = (label: string) => {
    setSelectedChips((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
    );
  };

  const allIngredients = [
    ...selectedChips,
    ...extraIngredients.split(/[、,，\s]+/).filter(Boolean),
  ].join("、");

  const generate = async () => {
    setLoading(true);
    setRecipes([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persons, type, ingredients: allIngredients, condition }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("ストリーム取得失敗");

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (!value) continue;

        const text = decoder.decode(value);
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          const parsed = JSON.parse(line.slice(6));
          if (parsed.error) { alert("エラーが発生しました"); return; }
          setRecipes((prev) => {
            const next = [...prev];
            next[parsed.index] = parsed.recipe;
            return next;
          });
        }
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const toggleFav = (recipe: Recipe) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.name === recipe.name);
      const next = exists ? prev.filter((f) => f.name !== recipe.name) : [...prev, recipe];
      localStorage.setItem("kondate_favs", JSON.stringify(next));
      return next;
    });
  };

  const isFav = (recipe: Recipe) => favorites.some((f) => f.name === recipe.name);

  return (
    <div className="min-h-screen bg-orange-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-orange-100 px-6 py-4 text-center">
        <h1 className="text-2xl font-black text-orange-500 tracking-tight">⚡️ 任せて献立くん</h1>
        <p className="text-xs text-stone-400 mt-1">献立を考えるのがめんどくさい？任せとき！</p>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* 設定まとめカード */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50 space-y-5">

          {/* 人数 */}
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">人数</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setPersons(n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    persons === n
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-orange-50 text-stone-500 hover:bg-orange-100"
                  }`}
                >
                  {n}人
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-100" />

          {/* 何を作る？ */}
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">何を作る？</p>
            <div className="flex gap-2">
              {[
                { value: "主菜（メインおかず）", label: "🍚 メイン" },
                { value: "副菜（あと一品・サラダ・和え物）", label: "🥗 副菜" },
                { value: "スープ（汁物・鍋物）", label: "🥣 スープ" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    type === t.value
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-orange-50 text-stone-500 hover:bg-orange-100"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-100" />

          {/* 食材 */}
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">冷蔵庫の食材</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {INGREDIENTS.map((ing) => (
                <button
                  key={ing.label}
                  onClick={() => toggleChip(ing.label)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${
                    selectedChips.includes(ing.label)
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-stone-600 border-stone-200 hover:border-orange-300"
                  }`}
                >
                  {ing.emoji} {ing.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={extraIngredients}
                onChange={(e) => setExtraIngredients(e.target.value)}
                placeholder="他の食材（例：カレー粉、ポン酢）"
                className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-300 transition-colors"
              />
              <button
                onClick={() => { setSelectedChips([]); setExtraIngredients(""); }}
                className="px-4 py-2.5 bg-stone-100 text-stone-500 rounded-xl text-xs font-medium hover:bg-stone-200 transition-colors"
              >
                リセット
              </button>
            </div>
          </div>

          <div className="border-t border-stone-100" />

          {/* こだわり */}
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-widest mb-3">今日のこだわり</p>
            <div className="flex flex-col gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCondition(c.value)}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-bold text-left transition-colors border ${
                    condition === c.value
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-white text-stone-600 border-stone-200 hover:border-orange-300"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* 生成ボタン */}
        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-orange-500 text-white py-5 rounded-2xl font-black text-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-orange-200"
        >
          {loading ? "献立くんが考えてます...🍳" : "献立を3つ爆速で出す！⚡️"}
        </button>

        {/* 結果 */}
        {recipes.length > 0 && (
          <div className="space-y-4">
            <p className="text-xs text-stone-400 text-center uppercase tracking-widest">今日の献立候補</p>
            {recipes.map((recipe, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-3">
                    <p className="font-black text-stone-800 text-lg leading-tight">{recipe.name}</p>
                    <div className="flex gap-3 mt-1 text-xs text-stone-400">
                      <span>⏱ {recipe.time}</span>
                      <span>🔥 {recipe.cal}</span>
                      <span>🧼 {recipe.wash}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFav(recipe)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex-shrink-0 ${
                      isFav(recipe)
                        ? "bg-red-50 border-red-200 text-red-400"
                        : "bg-stone-50 border-stone-200 text-stone-400 hover:border-orange-300"
                    }`}
                  >
                    {isFav(recipe) ? "⭐ 保存済" : "☆ 保存"}
                  </button>
                </div>

                <div className="bg-orange-50 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-orange-600 mb-1">材料（{persons}人分）</p>
                  <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">{recipe.materials}</p>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-bold text-stone-500 mb-1">手順</p>
                  <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">{recipe.steps}</p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.name + " レシピ")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-red-50 text-red-500 rounded-xl text-xs font-bold text-center hover:bg-red-100 transition-colors"
                  >
                    ▶ 動画で確認
                  </a>
                  <a
                    href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(recipe.name + " 料理")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 bg-stone-100 text-stone-500 rounded-xl text-xs font-bold text-center hover:bg-stone-200 transition-colors"
                  >
                    📷 写真で確認
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* お気に入り */}
        {favorites.length > 0 && (
          <div className="mt-8 pt-6 border-t-2 border-dashed border-orange-100">
            <p className="text-xs text-stone-400 uppercase tracking-widest text-center mb-4">⭐ お気に入り保存済み</p>
            <div className="space-y-4">
              {favorites.map((recipe, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-orange-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-black text-stone-800">{recipe.name}</p>
                      <div className="flex gap-3 mt-1 text-xs text-stone-400">
                        <span>⏱ {recipe.time}</span>
                        <span>🔥 {recipe.cal}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleFav(recipe)}
                      className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-400 rounded-xl text-xs font-bold"
                    >
                      削除
                    </button>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-orange-600 mb-1">材料（{persons}人分）</p>
                    <p className="text-sm text-stone-600 whitespace-pre-wrap">{recipe.materials}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
