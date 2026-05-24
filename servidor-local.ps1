$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 4174
$MaxPort = 4190

function Test-PortAvailable {
    param([int]$PortNumber)
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $PortNumber)
        $listener.Start()
        $listener.Stop()
        return $true
    }
    catch {
        return $false
    }
}

while ($Port -le $MaxPort -and -not (Test-PortAvailable -PortNumber $Port)) {
    $Port++
}

if ($Port -gt $MaxPort) {
    Write-Host "Nao encontrei uma porta livre entre 4174 e 4190."
    Read-Host "Pressione Enter para sair"
    exit 1
}

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".glb"  = "model/gltf-binary"
    ".gltf" = "model/gltf+json"
    ".bin"  = "application/octet-stream"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".webp" = "image/webp"
}

$Prefix = "http://127.0.0.1:$Port/"
$Listener = [System.Net.HttpListener]::new()
$Listener.Prefixes.Add($Prefix)
$Listener.Start()

Start-Process $Prefix

Write-Host ""
Write-Host "Senegal GO aberto em: $Prefix"
Write-Host "Mantenha esta janela aberta enquanto usa o site."
Write-Host "Para encerrar, feche esta janela ou pressione Ctrl+C."
Write-Host ""

try {
    while ($Listener.IsListening) {
        $Context = $Listener.GetContext()
        $RequestPath = [System.Uri]::UnescapeDataString($Context.Request.Url.AbsolutePath)

        if ($RequestPath -eq "/") {
            $RequestPath = "/index.html"
        }

        $RelativePath = $RequestPath.TrimStart("/") -replace "/", [System.IO.Path]::DirectorySeparatorChar
        $FilePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $RelativePath))
        $RootPath = [System.IO.Path]::GetFullPath($Root)

        if (-not $FilePath.StartsWith($RootPath, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
            $Context.Response.StatusCode = 404
            $NotFound = [System.Text.Encoding]::UTF8.GetBytes("Arquivo nao encontrado.")
            $Context.Response.OutputStream.Write($NotFound, 0, $NotFound.Length)
            $Context.Response.Close()
            continue
        }

        $Extension = [System.IO.Path]::GetExtension($FilePath).ToLowerInvariant()
        $ContentType = $MimeTypes[$Extension]
        if (-not $ContentType) {
            $ContentType = "application/octet-stream"
        }

        $Bytes = [System.IO.File]::ReadAllBytes($FilePath)
        $Context.Response.StatusCode = 200
        $Context.Response.ContentType = $ContentType
        $Context.Response.Headers.Add("Cache-Control", "no-store")
        $Context.Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        $Context.Response.Close()
    }
}
finally {
    if ($Listener.IsListening) {
        $Listener.Stop()
    }
    $Listener.Close()
}
