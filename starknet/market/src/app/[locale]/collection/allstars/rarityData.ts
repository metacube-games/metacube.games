import fs from "fs";
import path from "path";

export interface RarityRank {
  id: number;
}

export async function getRarityRanks(): Promise<RarityRank[]> {
  try {
    const filePath = path.join(process.cwd(), "public", "rarity_ranks.json");
    const fileContents = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContents);
  } catch {
    return [];
  }
}
