import { NextRequest, NextResponse } from 'next/server';
import { Chess } from 'chess.js';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { fen } = await request.json();

    const chess = new Chess(fen);
    const moves = chess.moves();

    if (moves.length === 0) {
      return NextResponse.json({ error: 'Sem movimentos possíveis' }, { status: 400 });
    }

    // Se não tiver API key, retornar movimento aleatório
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your_api_key_here') {
      console.log('API Key não configurada, usando movimento aleatório');
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      return NextResponse.json({ move: randomMove });
    }

    // Usar modelo gratuito do OpenRouter
    const prompt = `Você é uma IA burra jogando xadrez. A posição atual é: ${fen}

Movimentos válidos disponíveis: ${moves.join(', ')}

Escolha UM movimento da lista acima. Responda APENAS com o movimento escolhido, sem explicações.`;

    const { text } = await generateText({
      model: openrouter('nousresearch/deephermes-3-llama-3-8b-preview:free'),
      prompt,
      maxTokens: 20,
    });

    console.log('Resposta da IA:', text);

    // Extrair apenas o movimento da resposta
    const aiMove = text.trim().split(/\s+/)[0];

    console.log('Movimento extraído:', aiMove);
    console.log('Movimentos válidos:', moves);

    // Validar se o movimento é válido
    if (!moves.includes(aiMove)) {
      console.log('Movimento inválido, usando aleatório');
      // Se a IA retornar um movimento inválido, escolher um aleatório
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      return NextResponse.json({ move: randomMove });
    }

    return NextResponse.json({ move: aiMove });
  } catch (error) {
    console.error('Erro ao obter movimento da IA:', error);

    // Fallback: retornar movimento aleatório em caso de erro
    try {
      const { fen } = await request.json();
      const chess = new Chess(fen);
      const moves = chess.moves();
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      return NextResponse.json({ move: randomMove });
    } catch {
      return NextResponse.json({ error: 'Erro ao processar movimento' }, { status: 500 });
    }
  }
}
