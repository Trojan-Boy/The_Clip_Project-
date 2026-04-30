$API = "http://127.0.0.1:3100/api"
$companyId = "dc006652-4537-4f54-b2c6-8418224815c6"
$apiKey = "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"

$agents = Invoke-RestMethod -Uri "$API/companies/$companyId/agents"

$agentModels = @{
    "YC Scout" = "google/gemini-2.0-flash-exp:free"
    "Trend Mapper" = "deepseek/deepseek-r1:free"
    "Idea Scorer" = "deepseek/deepseek-r1:free"
    "Kill Switch" = "google/gemini-2.0-flash-exp:free"
    "CEO Agent" = "anthropic/claude-3.5-sonnet"
    "Product Architect" = "deepseek/deepseek-r1:free"
    "CTO Agent" = "qwen/qwen-2.5-coder-32b-instruct:free"
    "Coder Agent" = "qwen/qwen-2.5-coder-32b-instruct:free"
    "Designer Agent" = "meta-llama/llama-3.3-70b-instruct:free"
    "Landing Page Agent" = "qwen/qwen-2.5-coder-32b-instruct:free"
    "Growth Agent" = "google/gemini-2.0-flash-exp:free"
}

foreach ($agent in $agents.items) {
    $model = $agentModels[$agent.name]
    if ($model) {
        $body = @{
            adapter_type = "openrouter"
            adapter_config = @{
                model = $model
                apiKey = $apiKey
                timeoutSec = 120
            }
        }
        $json = $body | ConvertTo-Json -Depth 5
        try {
            Invoke-RestMethod -Method PATCH -Uri "$API/agents/$($agent.id)" -ContentType "application/json" -Body $json
            Write-Host "✅ Updated $($agent.name) to OpenRouter: $model" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed $($agent.name)" -ForegroundColor Red
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            Write-Host $reader.ReadToEnd() -ForegroundColor Yellow
        }
    }
}
