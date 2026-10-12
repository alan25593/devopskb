import os
import re
import json
import urllib.request
import urllib.parse

# 1. Paths
DEVOPKSB_ROOT = r"d:\Projects\devopskb"
CONTENT_K8S = os.path.join(DEVOPKSB_ROOT, "content", "kubernetes")
PUBLIC_DIAGRAMS = os.path.join(DEVOPKSB_ROOT, "public", "diagramas", "kubernetes")
os.makedirs(PUBLIC_DIAGRAMS, exist_ok=True)

# 2. Slug mapping
SLUG_MAP = {
    '101.Introduccion.md': '101-introduccion',
    '102.Arquitectura.md': '102-arquitectura',
    '103.Instalacion.md': '103-instalacion',
    '103.Playgrounds.md': '103-playgrounds',
    '104.Conceptos.md': '104-conceptos',
    '105.Pods.md': '105-pods',
    '106.Namespaces.md': '106-namespaces',
    '107.Deployments.md': '107-deployments',
    '108.DSySS.md': '108-daemonsets-y-statefulsets',
    '109.Jobs.md': '109-jobs-y-cronjobs',
    '110.Services.md': '110-services',
    '111.Ingress_controller.md': '111-ingress-controllers',
    '112.Gateway.md': '112-gateway-api',
    '113.Probes_live_readiness.md': '113-probes-healthchecks',
    '114.Secrets_configmaps.md': '114-secrets-y-configmaps',
    '115.Almacenamiento.md': '115-almacenamiento-pv-pvc',
    '116.Rangos_quotas.md': '116-limitranges-y-resourcequotas',
    '117.Autoscaling.md': '117-autoscaling-hpa-vpa',
    '118.Seguridad.md': '118-seguridad-serviceaccounts',
    '119.Usuarios.md': '119-usuarios-y-autenticacion',
    '120.Roles.md': '120-roles-y-rbac',
    '121.Scheduling_labels.md': '121-scheduling-labels-affinity',
    '122.Taints_tolerations.md': '122-taints-y-tolerations',
    '123.Logging.md': '123-logging-y-monitoreo',
    '124.Helm.md': '124-helm-package-manager',
    '125.Perfiles_software_dashboard.md': '125-perfiles-software-y-dashboard',
    '201.Mantenimiento_backup.md': '201-mantenimiento-etcd-backup',
    '202.Troubleshooting_cluster.md': '202-troubleshooting-cluster',
    '203.APIs_TLS_seguridad.md': '203-apis-tls-seguridad-control-plane',
    '204.Certificados_autenticacion.md': '204-certificados-pki-autenticacion',
    '205.Almacenamiento_avanzado.md': '205-almacenamiento-avanzado-csi',
    '206.CRDs_operators.md': '206-crds-y-operadores',
    '207.HA_disaster_recovery.md': '207-alta-disponibilidad-ha-dr',
    '208.Preparacion_CKA.md': '208-preparacion-examen-cka',
    '301.Pods_initcontainers.md': '301-pods-initcontainers',
    '302.Multicontainer_sidecars.md': '302-multicontainer-sidecars',
    '303.Canary_bluegreen.md': '303-canary-blue-green-deployments',
    '304.CoreDNS_DNS.md': '304-coredns-resolucion-dns',
    '305.Service_mesh.md': '305-service-mesh-istio-linkerd',
    '306.Troubleshooting_aplicaciones.md': '306-troubleshooting-aplicaciones',
    '307.Preparacion_CKAD.md': '307-preparacion-examen-ckad',
    '401.CIS_benchmarks.md': '401-cis-benchmarks-kube-bench',
    '402.Runtime_class.md': '402-runtime-class-gvisor-kata',
    '403.Network_policies_avanzadas.md': '403-network-policies-avanzadas',
    '404.Admission_controllers.md': '404-admission-controllers-webhooks',
    '405.Apparmor_seccomp.md': '405-apparmor-seccomp-capabilities',
    '406.Falco.md': '406-falco-runtime-security',
    '407.OPA.md': '407-opa-gatekeeper-kyverno',
    '408.Preparacion_CKS.md': '408-preparacion-examen-cks',
}

# 3. Download assets
def download_assets():
    print("--- Descargando diagramas e imágenes ---")
    asset_base_url = "https://raw.githubusercontent.com/pabpereza/pabpereza/main/docs/cursos/kubernetes/"
    diagrams = [
        'diagramas/arquitectura.drawio.svg',
        'diagramas/deployments.drawio.svg',
        'diagramas/instalacion-requisitos.drawio.svg',
        'diagramas/intro-kubernetes.drawio.svg',
        'diagramas/intro-tradicional.drawio.svg',
        'diagramas/services.drawio.svg',
        'img/AutoscalerComparison.gif',
        'img/HPALifecycle.gif',
        'img/banner_kubernetes.png',
        'img/intro-tradicional.svg',
    ]

    for item in diagrams:
        filename = os.path.basename(item)
        target_path = os.path.join(PUBLIC_DIAGRAMS, filename)
        url = asset_base_url + item
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req) as resp, open(target_path, 'wb') as f:
                f.write(resp.read())
            print(f"Descargado: {filename}")
        except Exception as e:
            print(f"Error descargando {item}: {e}")

# 4. Fetch and transform markdown files
def process_course_files():
    print("--- Procesando archivos de Pabpereza ---")
    headers = {'User-Agent': 'Mozilla/5.0'}
    api_url = "https://api.github.com/repos/pabpereza/pabpereza/contents/docs/cursos/kubernetes"
    req = urllib.request.Request(api_url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        items = json.loads(resp.read().decode('utf-8'))

    raw_files = [i for i in items if i['name'].endswith('.md') and i['name'] != 'README.md']

    for item in raw_files:
        name = item['name']
        slug = SLUG_MAP.get(name)
        if not slug:
            print(f"Saltando archivo no mapeado: {name}")
            continue

        dreq = urllib.request.Request(item['download_url'], headers=headers)
        with urllib.request.urlopen(dreq) as dresp:
            content = dresp.read().decode('utf-8')

        # Split frontmatter and body
        parts = re.split(r'^---\s*$', content, flags=re.MULTILINE)
        if len(parts) >= 3:
            fm_raw = parts[1]
            body = "---".join(parts[2:]).strip()
        else:
            fm_raw = ""
            body = content.strip()

        # Parse existing frontmatter keys
        title_m = re.search(r'^title:\s*(.+)$', fm_raw, re.MULTILINE)
        title = title_m.group(1).strip().strip('"').strip("'") if title_m else slug.replace('-', ' ').title()

        desc_m = re.search(r'^description:\s*(?:>-\s*)?([\s\S]*?)(?=^[a-zA-Z0-9_-]+:|\Z)', fm_raw, re.MULTILINE)
        if desc_m:
            desc = " ".join([line.strip() for line in desc_m.group(1).strip().splitlines()]).replace('"', '\\"')
        else:
            desc = f"Guía completa y práctica sobre {title} en Kubernetes."

        # Keywords
        kw_m = re.search(r'^keywords:\s*([\s\S]*?)(?=^[a-zA-Z0-9_-]+:|\Z)', fm_raw, re.MULTILINE)
        keywords = []
        if kw_m:
            keywords = [re.sub(r'^-\s*', '', line).strip().strip('"').strip("'") 
                        for line in kw_m.group(1).splitlines() if line.strip().startswith('-')]
        if not keywords:
            keywords = ["kubernetes", "k8s", slug]

        # Tags
        tags_m = re.search(r'^tags:\s*([\s\S]*?)(?=^[a-zA-Z0-9_-]+:|\Z)', fm_raw, re.MULTILINE)
        tags = []
        if tags_m:
            tags = [re.sub(r'^-\s*', '', line).strip().strip('"').strip("'") 
                    for line in tags_m.group(1).splitlines() if line.strip().startswith('-')]
        if not tags:
            tags = ["kubernetes"]

        # Ensure "kubernetes" tag
        if "kubernetes" not in tags:
            tags.insert(0, "kubernetes")

        # Clean body
        # 1. Replace diagram/img paths
        body = re.sub(r'\(!?\./diagramas/([^)]+)\)', r'(/diagramas/kubernetes/\1)', body)
        body = re.sub(r'\(diagramas/([^)]+)\)', r'(/diagramas/kubernetes/\1)', body)
        body = re.sub(r'\(img/([^)]+)\)', r'(/diagramas/kubernetes/\1)', body)
        body = re.sub(r'\(\./img/([^)]+)\)', r'(/diagramas/kubernetes/\1)', body)

        # 2. Replace markdown links to other chapters: (105.Pods.md) -> (/article/kubernetes/105-pods)
        for orig_file, mapped_slug in SLUG_MAP.items():
            bare_name = orig_file.replace('.md', '')
            body = re.sub(rf'\({re.escape(orig_file)}\)', f'(/article/kubernetes/{mapped_slug})', body)
            body = re.sub(rf'\({re.escape(bare_name)}\)', f'(/article/kubernetes/{mapped_slug})', body)

        # Build clean frontmatter
        kw_yaml = "\n".join([f'  - "{k}"' for k in keywords if k])
        tags_yaml = "\n".join([f'  - "{t}"' for t in tags if t])

        clean_fm = f"""---
title: "{title}"
category: "kubernetes"
description: "{desc}"
tags:
{tags_yaml}
keywords:
{kw_yaml}
---

"""
        target_file = os.path.join(CONTENT_K8S, f"{slug}.md")
        with open(target_file, 'w', encoding='utf-8') as f:
            f.write(clean_fm + body + "\n")

        print(f"Generado: {slug}.md")

# 5. Adapt Alan's existing specialized articles
def adapt_existing_articles():
    print("--- Adaptando artículos especializados preexistentes ---")
    backup_dir = os.path.join(CONTENT_K8S, "_backup")
    specialized_mappings = {
        '02-kubectl.md': ('102b-kubectl-cheatsheet.md', 'kubectl: Cheat Sheet de Comandos Esenciales y Depuración'),
        '10-herramientas.md': ('126-ecosistema-herramientas-cli.md', 'Kubernetes: Ecosistema de Herramientas CLI (k9s, Helm, Kustomize, kubectx)'),
        '13-autoscaling-nodos.md': ('209-autoscaling-nodos-karpenter.md', 'Autoscaling de Nodos en Kubernetes: Karpenter y Cluster Autoscaler'),
        '11-gitops-y-cd.md': ('308-gitops-argocd-flux.md', 'GitOps y Continuous Delivery en Kubernetes con ArgoCD y Flux'),
        '12-observabilidad.md': ('309-observabilidad-prometheus-grafana.md', 'Observabilidad en Kubernetes: Prometheus, Grafana, Loki y OpenTelemetry'),
    }

    for src_name, (dest_name, new_title) in specialized_mappings.items():
        src_path = os.path.join(backup_dir, src_name)
        if not os.path.exists(src_path):
            continue
        with open(src_path, 'r', encoding='utf-8') as f:
            raw = f.read()

        # Update title in frontmatter
        updated = re.sub(r'title:\s*"[^"]+"', f'title: "{new_title}"', raw)
        dest_path = os.path.join(CONTENT_K8S, dest_name)
        with open(dest_path, 'w', encoding='utf-8') as f:
            f.write(updated)
        print(f"Integrado: {dest_name}")

# 6. Cleanup obsolete old 01-15 files from CONTENT_K8S
def cleanup_old_files():
    print("--- Limpiando archivos obsoletos 01-15 ---")
    for i in range(1, 16):
        pattern = f"{i:02d}-"
        for f in os.listdir(CONTENT_K8S):
            if f.startswith(pattern) and f.endswith('.md'):
                old_path = os.path.join(CONTENT_K8S, f)
                os.remove(old_path)
                print(f"Eliminado archivo obsoleto: {f}")

if __name__ == '__main__':
    download_assets()
    process_course_files()
    adapt_existing_articles()
    cleanup_old_files()
    print("=== MIGRACIÓN COMPLETADA EXITOSAMENTE ===")
