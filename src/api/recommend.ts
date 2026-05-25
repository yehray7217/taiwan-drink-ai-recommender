import type { NextApiRequest, NextApiResponse } from 'next';
import { runAgentPipeline } from '../lib/agentPipeline';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 確保前端只能用 POST 請求發送資料
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // 從前端傳來的 Request Body 中解構出資料
        const { userPref, candidates } = req.body;

        // 呼叫你的 C 模組大腦 (加上 await 因為它是非同步的)
        const finalDecision = await runAgentPipeline(userPref, candidates);

        // 將運算完的結果轉換成 JSON，用 HTTP 200 狀態碼回傳給前端
        res.status(200).json(finalDecision);
        
    } catch (error) {
        console.error("Pipeline 執行錯誤:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}