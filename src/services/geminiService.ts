import { GoogleGenAI, Type } from "@google/genai";
import { OrderItem } from "@/types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// 텍스트 처리를 위한 스키마
const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      vendorName: { type: Type.STRING, description: "외주처 (예: 위드맘, 씨엘로)" },
      productName: { type: Type.STRING, description: "품명" },
      productCode: { type: Type.STRING, description: "제품코드 (F열, 숫자와 문자 조합)" },
      quantity: { type: Type.STRING, description: "수량" },
      deliveryDate: { type: Type.STRING, description: "납기요청일 (예: 12월 28일)" },
      notes: { type: Type.STRING, description: "특이사항" }
    },
    required: ["vendorName", "productName", "quantity"]
  }
};

const SYSTEM_PROMPT = `
  당신은 자재 발주 관리자입니다. 제공된 이미지(엑셀 캡처)나 텍스트에서 발주 내역을 추출하세요.

  [추출 규칙]
  1. '외주처', '품명', '제품코드', '수량', '납기요청일', '특이사항' 컬럼을 중점적으로 봅니다.
  2. '외주처'가 빈 칸인 경우, 엑셀의 병합된 셀처럼 위의 행과 동일한 것으로 간주하거나 문맥상 파악하세요.
  3. 날짜는 "12월 28일"과 같이 읽기 편한 포맷으로 유지하세요.
  4. 제품코드는 F열에 있으며, 숫자와 문자 조합으로 정확히 추출하세요.
  5. 불필요한 행(헤더 등)은 제외하고 실제 데이터만 추출하세요.
`;

export const parseOrdersWithGemini = async (input: string, isImage: boolean = false): Promise<Omit<OrderItem, 'id' | 'isCompleted'>[]> => {
  try {
    let contentParts: any[] = [];

    if (isImage) {
      // input is base64 data URL like "data:image/jpeg;base64,/9j/4AAQ..."
      // Extract mimeType and base64 data
      let mimeType = "image/png";
      let base64Data = input;

      if (input.includes('base64,')) {
        const matches = input.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = input.split('base64,')[1];
        }
      }

      contentParts = [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: "이 엑셀 이미지에서 발주 리스트를 추출해줘. 외주처, 품명, 제품코드(F열), 수량, 납기요청일, 특이사항을 정확히 읽어줘."
        }
      ];
    } else {
      contentParts = [
        {
          text: `Raw Text:\n${input}`
        }
      ];
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: {
        parts: contentParts
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    return [];
  } catch (error) {
    console.error("Error parsing orders:", error);
    throw new Error("발주 내역을 분석하지 못했습니다. 이미지가 선명한지 확인해주세요.");
  }
};
