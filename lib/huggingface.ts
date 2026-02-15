import { HfInference } from "@huggingface/inference";

// Initialize the client
// We create the client inside the functions or singleton to ensure API key is loaded
const getClient = (apiKey: string) => {
    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        throw new Error("MISSING_API_KEY");
    }
    return new HfInference(apiKey);
};

export async function queryHuggingFace(input: string, systemPrompt: string, apiKey: string): Promise<string> {
    const hf = getClient(apiKey);

    // The "conversational" task requires chatCompletion
    // Switching to Qwen2.5-7B-Instruct for better free-tier availability 
    const MODEL = "Qwen/Qwen2.5-7B-Instruct";

    try {
        const response = await hf.chatCompletion({
            model: MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: input }
            ],
            max_tokens: 150,
            temperature: 0.7,
        });

        return response.choices[0].message.content?.trim() || "NO_RESPONSE";
    } catch (error: any) {
        console.error("HF SDK Chat Error:", error);
        throw new Error(`Failed to chat with ${MODEL}. Details: ${error.message}`);
    }
}

export async function generateAvatarImage(prompt: string, apiKey: string): Promise<string> {
    const hf = getClient(apiKey);

    try {
        const blob = await hf.textToImage({
            model: "stabilityai/stable-diffusion-xl-base-1.0",
            inputs: prompt,
            parameters: {
                negative_prompt: "blurry, low quality, distortion, deformed",
            }
        });

        // Fix TypeScript error: explicitly cast if inference is wrong
        return URL.createObjectURL(blob as unknown as Blob);
    } catch (error: any) {
        console.error("HF SDK Image Error:", error);
        throw error;
    }
}
