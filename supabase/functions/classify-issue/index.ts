// declare Deno namespace for IDE TypeScript checkers
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY secret is not set in Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are a civic issue classifier for a municipal portal in India.
Analyze the following civic issue title and description and classify it into EXACTLY ONE of these departments:
- Roads
- Water
- Sanitation
- Electricity
- Health
- Other

Also assess the severity rating from 1 (minor issue) to 5 (critical emergency / major infrastructure failure / safety risk).

Title: ${title || ''}
Description: ${description || ''}

Respond with valid JSON ONLY in this format:
{"department": "Roads", "severity": 3}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Gemini API request failed with status ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    let parsedResult = { department: 'Other', severity: 3 };
    try {
      const cleanJsonStr = contentText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanJsonStr);
    } catch (e) {
      console.error('Failed to parse Gemini response JSON:', contentText);
    }

    const validCategories = ['Roads', 'Water', 'Sanitation', 'Electricity', 'Health', 'Other'];
    let dept = parsedResult.department || 'Other';
    if (!validCategories.includes(dept)) {
      dept = 'Other';
    }

    let sev = Number(parsedResult.severity) || 3;
    if (sev < 1) sev = 1;
    if (sev > 5) sev = 5;

    return new Response(
      JSON.stringify({ department: dept, severity: sev }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
