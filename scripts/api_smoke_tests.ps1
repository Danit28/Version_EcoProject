$ErrorActionPreference = 'Stop'
$base = 'http://localhost:4000/api'
$tag = 'QA_' + (Get-Date -Format 'yyyyMMddHHmmss')
$result = @()

function Add-Result($name, $ok, $detail) {
  $script:result += [pscustomobject]@{
    prueba = $name
    estado = $(if ($ok) { 'OK' } else { 'FALLA' })
    detalle = $detail
  }
}

try {
  $sedeBody = @{ nombre = "$tag Sede"; direccion = 'Dir QA'; telefono = '3000000000' } | ConvertTo-Json
  $sede = Invoke-RestMethod -Method Post -Uri "$base/sedes" -ContentType 'application/json' -Body $sedeBody
  Add-Result 'RF-06 Crear sede' $true ("id=" + $sede.id)

  $mpBody = @{ nombre = "$tag MP"; unidad_medida = 'kg'; cantidad_disponible = 50; nivel_minimo = 10 } | ConvertTo-Json
  $mp = Invoke-RestMethod -Method Post -Uri "$base/materias-primas" -ContentType 'application/json' -Body $mpBody
  Add-Result 'RF-01 Crear materia prima' $true ("id=" + $mp.id)

  $mpUpBody = @{ nombre = "$tag MP Edit"; unidad_medida = 'kg'; cantidad_disponible = 55; nivel_minimo = 12 } | ConvertTo-Json
  $mpUp = Invoke-RestMethod -Method Put -Uri "$base/materias-primas/$($mp.id)" -ContentType 'application/json' -Body $mpUpBody
  $hist = Invoke-RestMethod -Method Get -Uri "$base/materias-primas/$($mp.id)/historial"
  Add-Result 'RF-02 Editar materia prima' ($mpUp.nombre -like '*Edit*' -and $hist.Count -ge 1) ("historial=" + $hist.Count)

  $prodBody = @{ nombre = "$tag Producto"; descripcion = 'Producto QA' } | ConvertTo-Json
  $prod = Invoke-RestMethod -Method Post -Uri "$base/productos" -ContentType 'application/json' -Body $prodBody
  Add-Result 'RF-04 Crear producto' $true ("id=" + $prod.id)

  $formulaBody = @{ detalles = @(@{ materia_prima_id = $mp.id; cantidad_requerida = 1.5 }) } | ConvertTo-Json -Depth 5
  $formula = Invoke-RestMethod -Method Put -Uri "$base/productos/$($prod.id)/formula" -ContentType 'application/json' -Body $formulaBody
  Add-Result 'RF-05 Guardar formula' ($formula.Count -ge 1) ("detalles=" + $formula.Count)

  try {
    Invoke-RestMethod -Method Delete -Uri "$base/materias-primas/$($mp.id)"
    Add-Result 'RF-03 Bloqueo eliminacion asociada' $false 'Permitio eliminar pero debia bloquear'
  }
  catch {
    Add-Result 'RF-03 Bloqueo eliminacion asociada' $true 'Bloqueada correctamente'
  }

  $prodRegBody = @{ producto_id = $prod.id; cantidad_producida = 5; observacion = "$tag PRODUCCION" } | ConvertTo-Json
  $prodReg = Invoke-RestMethod -Method Post -Uri "$base/produccion" -ContentType 'application/json' -Body $prodRegBody
  Add-Result 'Produccion con consumo automatico' ($prodReg.produccion_id -gt 0) ("produccion_id=" + $prodReg.produccion_id)

  $distBody = @{ producto_id = $prod.id; sede_id = $sede.id; cantidad = 4; referencia = "$tag DIST" } | ConvertTo-Json
  $dist = Invoke-RestMethod -Method Post -Uri "$base/inventario/distribuciones" -ContentType 'application/json' -Body $distBody
  Add-Result 'Distribucion central a sede' ($dist.ok -eq $true) 'Distribucion aplicada'

  $inv = Invoke-RestMethod -Method Get -Uri "$base/inventario?sede_id=$($sede.id)"
  $invItem = $inv | Where-Object { $_.producto_id -eq $prod.id } | Select-Object -First 1
  if ($null -ne $invItem) {
    $minBody = @{ cantidad_minima = 4 } | ConvertTo-Json
    $invUp = Invoke-RestMethod -Method Put -Uri "$base/inventario/$($invItem.id)/minimo" -ContentType 'application/json' -Body $minBody
    Add-Result 'Inventario por sede y minimo' ($invUp.cantidad_minima -eq 4) ("inventario_id=" + $invItem.id)
  }
  else {
    Add-Result 'Inventario por sede y minimo' $false 'No encontro registro de inventario'
  }

  $adjBody = @{ sede_id = $sede.id; producto_id = $prod.id; cantidad_delta = -2; referencia = "$tag AJUSTE" } | ConvertTo-Json
  $adj = Invoke-RestMethod -Method Post -Uri "$base/inventario/ajustes" -ContentType 'application/json' -Body $adjBody
  Add-Result 'Ajuste manual inventario' ($adj.ok -eq $true) 'Ajuste aplicado'

  $alert = Invoke-RestMethod -Method Get -Uri "$base/alertas"
  $dash = Invoke-RestMethod -Method Get -Uri "$base/dashboard/resumen"
  $okDash = ($dash.materiasPrimas -ge 1 -and $dash.productos -ge 1 -and $dash.sedes -ge 1)
  Add-Result 'Consultas rapidas dashboard' $okDash ("materias=" + $dash.materiasPrimas + ', productos=' + $dash.productos + ', sedes=' + $dash.sedes)
  Add-Result 'Alertas endpoint' ($null -ne $alert.materiaPrimaBaja -and $null -ne $alert.productosBajosPorSede) 'Respuesta valida'

  Add-Result 'Limpieza datos QA por API' $true 'Se omite borrado por API cuando hay movimientos historicos (FK RESTRICT); usar limpieza SQL.'
}
catch {
  Add-Result 'Ejecucion general suite' $false $_.Exception.Message
}

$result | Format-Table -AutoSize
