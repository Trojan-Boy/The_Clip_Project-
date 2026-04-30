$API = "http://127.0.0.1:3100/api"
$companyId = "dc006652-4537-4f54-b2c6-8418224815c6"

function Create-Agent {
    param($body)
    $json = $body | ConvertTo-Json -Depth 5
    try {
        $result = Invoke-RestMethod -Method POST -Uri "$API/companies/$companyId/agents" -ContentType "application/json" -Body $json
        Write-Host "✅ Created: $($result.name) (ID: $($result.id))" -ForegroundColor Green
        return $result
    } catch {
        Write-Host "❌ Failed: $($body.name) - $($_.Exception.Message)" -ForegroundColor Red
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd() -ForegroundColor Yellow
        return $null
    }
}

# --- 1. CEO Agent (Layer 2 - Decision) - No reportsTo ---
$ceo = Create-Agent @{
    name = "CEO Agent"
    role = "ceo"
    title = "Chief Executive Officer"
    capabilities = "Strategic GO/NO-GO verdict on startup ideas. Final decision-maker for the pipeline. Reviews overall company health and pipeline performance."
    adapter_type = "process"
    adapter_config = @{
        command = "claude"
        args = @("--model", "claude-sonnet-4-5")
        env = @{}
        timeoutSec = 900
    }
}

if (-not $ceo) { Write-Host "CEO creation failed, aborting." -ForegroundColor Red; exit 1 }
$ceoId = $ceo.id
Write-Host "`nCEO ID: $ceoId`n" -ForegroundColor Cyan

# --- 2. CTO Agent (Layer 3 - Build) - Reports to CEO ---
$cto = Create-Agent @{
    name = "CTO Agent"
    role = "cto"
    title = "Chief Technology Officer"
    reports_to = $ceoId
    capabilities = "Chooses tech stack and architecture for MVPs. Makes critical technical decisions for the Build layer."
    adapter_type = "process"
    adapter_config = @{
        command = "opencode"
        args = @("--model", "qwen-2.5-coder-32b")
        env = @{}
        timeoutSec = 900
    }
}
$ctoId = $cto.id
Write-Host "CTO ID: $ctoId`n" -ForegroundColor Cyan

# --- Layer 1: Intelligence (report to CEO) ---

$ycScout = Create-Agent @{
    name = "YC Scout"
    role = "researcher"
    title = "Intelligence Scout - YC & HN"
    reports_to = $ceoId
    capabilities = "Scans YC batches and Hacker News daily. Discovers promising startup ideas from YC batch announcements, Show HN posts, and trending discussions."
    adapter_type = "process"
    adapter_config = @{
        command = "gemini"
        args = @("--model", "gemini-2.0-flash")
        env = @{}
        timeoutSec = 900
    }
}

$trendMapper = Create-Agent @{
    name = "Trend Mapper"
    role = "researcher"
    title = "Intelligence Analyst - Trend Detection"
    reports_to = $ceoId
    capabilities = "Spots patterns across startup ideas and market signals. Identifies emerging categories, technology convergence, and recurring themes."
    adapter_type = "process"
    adapter_config = @{
        command = "opencode"
        args = @("--model", "deepseek-r1")
        env = @{}
        timeoutSec = 900
    }
}

# --- Layer 2: Decision (report to CEO) ---

$ideaScorer = Create-Agent @{
    name = "Idea Scorer"
    role = "researcher"
    title = "Decision Analyst - Idea Scoring"
    reports_to = $ceoId
    capabilities = "Scores each startup idea 0-100 based on Market (0-25), Feasibility (0-25), Timing (0-25), and Uniqueness (0-25). Quantitative analyst of the investment committee."
    adapter_type = "process"
    adapter_config = @{
        command = "opencode"
        args = @("--model", "deepseek-r1")
        env = @{}
        timeoutSec = 900
    }
}

$killSwitch = Create-Agent @{
    name = "Kill Switch"
    role = "pm"
    title = "Decision Filter - Idea Gatekeeper"
    reports_to = $ceoId
    capabilities = "Filters out bad ideas fast. Ruthless gatekeeper ensuring only the strongest ideas reach the CEO. Auto-kills ideas scoring below 50 or with fatal flaws."
    adapter_type = "process"
    adapter_config = @{
        command = "gemini"
        args = @("--model", "gemini-2.0-flash")
        env = @{}
        timeoutSec = 900
    }
}

# --- Layer 3: Build (report to CTO) ---

$productArchitect = Create-Agent @{
    name = "Product Architect"
    role = "pm"
    title = "Build Lead - MVP Specification"
    reports_to = $ctoId
    capabilities = "Breaks greenlit startup ideas into concrete MVP specifications. Defines core features, user stories, success metrics, and scope boundaries."
    adapter_type = "process"
    adapter_config = @{
        command = "opencode"
        args = @("--model", "deepseek-r1")
        env = @{}
        timeoutSec = 900
    }
}

$coderAgent = Create-Agent @{
    name = "Coder Agent"
    role = "engineer"
    title = "Software Engineer - Production Code"
    reports_to = $ctoId
    capabilities = "Writes production-ready code for MVPs. Implements frontend, backend, database schema, and deployment configuration following the CTO's architecture plan."
    adapter_type = "process"
    adapter_config = @{
        command = "opencode"
        args = @("--model", "qwen-2.5-coder-32b")
        env = @{}
        timeoutSec = 900
    }
}

$designerAgent = Create-Agent @{
    name = "Designer Agent"
    role = "designer"
    title = "UI/UX Designer"
    reports_to = $ctoId
    capabilities = "Creates full UI/UX specifications for MVPs. Design system, wireframes, user flows, component specs, responsive design, and interaction patterns."
    adapter_type = "process"
    adapter_config = @{
        command = "opencode"
        args = @("--model", "llama-3.3-70b")
        env = @{}
        timeoutSec = 900
    }
}

# --- Layer 4: Launch ---

$landingPageAgent = Create-Agent @{
    name = "Landing Page Agent"
    role = "engineer"
    title = "Launch Engineer - Landing Page"
    reports_to = $ctoId
    capabilities = "Writes and codes landing pages for launched products. Creates hero sections, feature showcases, CTAs, and SEO-optimized marketing sites."
    adapter_type = "process"
    adapter_config = @{
        command = "opencode"
        args = @("--model", "qwen-2.5-coder-32b")
        env = @{}
        timeoutSec = 900
    }
}

$growthAgent = Create-Agent @{
    name = "Growth Agent"
    role = "cmo"
    title = "Growth Strategist - GTM & Content"
    reports_to = $ceoId
    capabilities = "Creates go-to-market strategy and content plans. Launch strategy, content calendar, channel strategy, launch copy, SEO strategy, and growth metrics."
    adapter_type = "process"
    adapter_config = @{
        command = "gemini"
        args = @("--model", "gemini-2.0-flash")
        env = @{}
        timeoutSec = 900
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🏭 Idea Factory - All Agents Created!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Company ID: $companyId" -ForegroundColor White
Write-Host ""
Write-Host "Layer 1 - Intelligence:" -ForegroundColor Yellow
Write-Host "  YC Scout:          $($ycScout.id)"
Write-Host "  Trend Mapper:      $($trendMapper.id)"
Write-Host ""
Write-Host "Layer 2 - Decision:" -ForegroundColor Yellow
Write-Host "  Idea Scorer:       $($ideaScorer.id)"
Write-Host "  Kill Switch:       $($killSwitch.id)"
Write-Host "  CEO Agent:         $ceoId"
Write-Host ""
Write-Host "Layer 3 - Build:" -ForegroundColor Yellow
Write-Host "  Product Architect: $($productArchitect.id)"
Write-Host "  CTO Agent:         $ctoId"
Write-Host "  Coder Agent:       $($coderAgent.id)"
Write-Host "  Designer Agent:    $($designerAgent.id)"
Write-Host ""
Write-Host "Layer 4 - Launch:" -ForegroundColor Yellow
Write-Host "  Landing Page Agent:$($landingPageAgent.id)"
Write-Host "  Growth Agent:      $($growthAgent.id)"
Write-Host "========================================" -ForegroundColor Cyan
