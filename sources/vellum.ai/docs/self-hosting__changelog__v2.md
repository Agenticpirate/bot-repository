> For clean Markdown of any page, append .md to the page URL.
> For a complete documentation index, see https://docs.vellum.ai/llms.txt.
> For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at https://docs.vellum.ai/_mcp/server.

# Version 0.2

## \[HOTFIX] v0.2.20 - March 11, 2025

**Bugfixes**

* Pins image version tags at correct SHAs so that images are not using latest which may break compatibility between upgrades

---

## v0.2.19 - March 10, 2025

**New Additions**

Added new models including:

* **GPT-4.5 Preview** by OpenAI
* **QwQ** by Qwen
* Others you may find via our [official app changelog](https://docs.vellum.ai/changelog/2025/2025-02)

**Helm chart changes** for finer tuned configurability for cluster operators

**Bugfixes**

* Various stability improvements

---

## \[HOTFIX] v0.2.13 - February 12, 2025

**Bugfixes**

* Fixes `django.db.utils.OperationalError: could not translate host name "vellum-postgres-r.default.svc.cluster.local" to address: Name or service not known` error occurring in the clickhouse-backups cronjob

---

## v0.2.11 - February 10, 2025

**New Additions**

Added new models including:

* **xAI model host** with Grok 2
* **DeepSeek V3** via Fireworks AI
* Others you may find via our [official app changelog](https://docs.vellum.ai/changelog/2025/2025-02)

**Backend changes** that result in a more responsive/performant UI

**Bugfixes**

* Various stability improvements

---

## \[HOTFIX] v0.2.9 - January 30, 2025

**Bugfixes**

* Fixed `Failed to resolve '<replace-me'` errors when invoking API nodes in workflows

---

## v0.2.8 - January 28, 2025

**NOTE:** Due to [a known issue with the KEDA helm chart](https://github.com/kedacore/charts/issues/226), we are not able to add it as a dependency. In order to deploy v0.2.x+, you must first [install KEDA in your cluster](https://keda.sh/docs/2.16/deploy/#install)

```bash
# Add kedacore repo to helm
➜ helm repo add kedacore https://kedacore.github.io/charts
# Update your helm repos
➜ helm repo update
# Install the KEDA chart to your cluster in the Vellum app namespace
➜ helm install keda kedacore/keda --namespace <YOUR_VELLUM_NAMESPACE>
# Then proceed with the upgrade in your kots admin console.....
```

**New Additions**

* Added **DeepSeek R1** support
* Added many new handlers to the cluster
  * Configuration can be found within **Vellum Message Handlers** subsection in the KOTS Admin Console

**Removals**

* Removed `job/vellum-ai-pubsub-init-hook`

**Bugfixes**

* Various stability improvements

---

## v0.2.0 - December 20, 2024

**NOTE:** Due to [a known issue with the KEDA helm chart](https://github.com/kedacore/charts/issues/226), we are not able to add it as a dependency. In order to deploy v0.2.x+, you must first [install KEDA in your cluster](https://keda.sh/docs/2.16/deploy/#install)

```bash
# Add kedacore repo to helm
➜ helm repo add kedacore https://kedacore.github.io/charts
# Update your helm repos
➜ helm repo update
# Install the KEDA chart to your cluster in the Vellum app namespace
➜ helm install keda kedacore/keda --namespace <YOUR_VELLUM_NAMESPACE>
# Then proceed with the upgrade in your kots admin console.....
```

**New Additions**

* **First major architectural piece** — documents processing — now uses in-cluster RabbitMQ instead of Pub/Sub
  * We will continue to cut over pieces of our architecture to use RabbitMQ exclusively for event-driven workloads
* Added **bitnami/rabbitmq** as a dependency
* Added **various handlers for documents processing**
  * These handlers are configurable via a new section the KOTS config form labeled "Vellum Documents Handlers"
  * This replaces the ffs deployment
* Added **[KEDA](https://keda.sh/) ScaledObjects and TriggerAuthentication** for autoscaling based on QueueLength in addition to typical CPU/Memory utilization metrics
* Added **HPAs for the django and django-task-handlers deployments** — configurable via the KOTS admin console
  * These will likely be replaced in favor of KEDA HPAs in a future release
* Added **annotation text area for Ingress object** for custom annotations

**Bugfixes**

* Cleaned up KOTS config form to only show cloud provider-specific options
* Removed `/grafana` path from Ingress object
* Fixed `iam.gke.io/gcp-service-account` missing annotation issue with the default ServiceAccount
* Removed hardcoded read replica value for PostgreSQL