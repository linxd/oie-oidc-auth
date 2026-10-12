# OIE OIDC 认证

此扩展为 OIE Web 管理器添加 OpenID Connect 单点登录功能。它运行在引擎上，将浏览器重定向到身份提供者并交换授权码。它验证 ID 令牌并将用户以引擎用户名登录。它可以在首次登录时创建引擎用户，并可以从提供者声明中分配 RBAC 角色。

**文档：**[wiki](https://github.com/gibson9583/oie-oidc-auth/wiki) 包含带截图的安装和配置指南、Keycloak、Microsoft Entra ID、Okta 和 AWS Cognito 的提供者指南以及故障排除页面。本 README 为参考文档。

## 环境要求

- OIE 4.6.0。
- OIE Web 管理器 0.9.0 或更高版本。
- 一个 OpenID Connect 提供者上的机密客户端，需要其客户端 ID 和客户端密钥。
- 重定向 URI `<web-administrator-url>/oidc/callback`，需在提供者处注册。
- 可选：基于角色的访问控制 (RBAC) 扩展。角色分配需要此扩展。在没有 RBAC 的情况下启用用户创建前，请先阅读*即时用户*章节。

构建需要：Java 17、Maven 和 OIE 4.6.0 安装。

## 构建

```sh
OIE_HOME=/path/to/oie mvn clean package
```

构建输出 `target/oidcauth-1.0.2.zip`。GitHub 上的每个发布版也附带此文件。

## 安装

1. 将 zip 解压到引擎的扩展目录。
2. 重启引擎。
3. 在 Web 管理器中打开 **设置 → OIDC 认证**。扩展加载后此选项卡会出现。如果扩展未加载，引擎将没有 OIDC 端点、没有 `manageOIDC` 权限、也没有设置选项卡。

扩展在正常运行时不会向引擎日志写入任何内容。当紧急开关被设置、存储的策略被拒绝、以及 JIT 预配在没有 RBAC 扩展的情况下开启时，它会记录一条 WARN 日志。要在日志中查看其状态，将日志记录器 `org.openintegrationengine.plugins.oidc` 设置为 DEBUG。引擎随后会在启动时和每次保存后写入一行以 `OIDC authentication is` 开头的日志。该行报告四种状态之一：

- `ACTIVE for <discovery-url>`
- `disabled (policy key 'enabled' is false)`
- `SWITCHED OFF by OIE_OIDC_DISABLED`
- `not configured: <reason>`

## 权限

扩展权限 `manageOIDC` 保护设置选项卡及其 API。

安装 RBAC 后：

- 管理员角色 (`is_admin`) 上的用户持有 `manageOIDC`。他们持有所有扩展权限。不要将 `manageOIDC` 添加到管理员角色。角色编辑器会以只读方式显示该角色。
- 将 `manageOIDC` 授予需要管理 SSO 策略的其他角色。

未安装 RBAC 时，每个已登录用户都可以打开此选项卡。

Web 模块在加载时发送 `GET /api/extensions/oidcauth/configuration`。`403` 响应会隐藏选项卡。任何其他响应都会显示选项卡。如果选项卡缺失，请检查该响应。Servlet 在每次操作时都会检查权限。

引擎的审计日志将每次保存记录为 **Manage OIDC configuration**，每次测试记录为 **Test OIDC configuration**。每个事件仅记录用户和结果。没有事件包含策略或客户端密钥。

## 配置

1. 在提供者处使用重定向 URI `<web-administrator-url>/oidc/callback` 注册客户端。输入 Web 管理器 URL 后，设置选项卡会显示确切的值。
2. 在 Web 管理器中，打开 **设置 → OIDC 认证**。
3. 选择 **启用 OIDC 登录**。这会解锁其他字段。
4. 输入 **Discovery URL**、**Client ID**、**Client secret** 和 **Web 管理器 URL**。
5. 选择 **测试连接**。这会读取发现文档、获取密钥集并计算可以验证令牌的签名密钥数量。不会进行任何更改。
6. 选择 **保存**。

**保存** 会验证策略、将其存储到引擎数据库并应用到运行中的扩展。无需重启。**刷新** 会重新读取存储的策略。

此选项卡具有以下特性：

- 在选择了 **启用 OIDC 登录** 之前，所有字段保持锁定。
- 被运维覆盖固定的字段为只读并标记为*已固定*。参见*运维覆盖*章节。
- 横幅会报告活动的紧急开关。横幅也会报告引擎拒绝的策略及原因。
- **默认角色** 和每个 **声明到角色的映射** 目标提供引擎的 RBAC 角色。已存储但 RBAC 不再列出的名称保持选中状态并被标记。
- **关联账户** 提供引擎的用户。在读取发现文档后的登录中，选项卡会自动填写新绑定的 `issuer#` 部分。
- 声明字段在输入时会建议常用的声明名称。它们接受任何文本。
- 当选项卡无法读取列表时，会回退到自由文本输入。
- 选项卡将存储的客户端密钥显示为 `********`。保存掩码时保留存储的密钥。输入新值以替换它。

## 策略存储

策略以扩展的插件属性形式存储在引擎数据库中。客户端密钥在存储前使用引擎的密钥加密，因此扩展页面上的原始属性视图和服务器配置导出会显示密文。以明文存储的密钥或由其他引擎密钥无法解密的密钥会被拒绝，直到在设置选项卡中重新输入。因此，恢复到具有不同密钥库的引擎上的导出需要重新输入密钥。

### 运维覆盖

每个策略键都可以在数据库外部固定：

- 环境变量：`OIE_OIDC_<KEY>`。将键大写并用下划线替换每个点和连字符。`roles.default` 变为 `OIE_OIDC_ROLES_DEFAULT`。
- 系统属性：`org.openintegrationengine.oidc.<key>`，键保持不变。示例：`-Dorg.openintegrationengine.oidc.roles.default=User`。

环境变量优先于系统属性。两者都优先于存储的策略。选项卡以只读方式显示固定的键，且不将其包含在保存中。自动化安装可以通过这种方式设置整个策略。

### 紧急开关

`OIE_OIDC_DISABLED=true`（或系统属性 `org.openintegrationengine.oidc.disabled=true`）关闭 SSO。引擎拒绝所有 OIDC 登录，登录页面不再提供 SSO。存储的策略保持不变，选项卡报告开关状态。这不同于 `OIE_OIDC_ENABLED=false`，后者固定策略键 `enabled`。

## 登录流程

引擎公开三个不需要会话的操作：`GET /api/extensions/oidcauth/public`、`POST /start` 和 `POST /callback`。每个引擎 API 请求必须携带 `X-Requested-With` 头，因此提供者不会直接联系引擎。Web 管理器转发提供者的响应。

1. 登录页面读取 `/public`。响应携带 `configured`、`providerLabel` 和 `autoRedirect`，不包含提供者的相关信息。
2. 用户选择 **使用 <label> 登录**。页面发送 `/start` 及返回路由。引擎将 `state`、`nonce`、PKCE 验证器和返回路由密封在 HttpOnly cookie `oie-oidc-txn` 中，有效期为十分钟。引擎返回提供者的授权 URL，浏览器打开它。
3. 提供者将浏览器发送到 `<web-administrator-url>/oidc/callback`，携带 `code` 和 `state`。
4. 页面将 `code` 和 `state` 发送到 `/callback`。引擎打开 cookie，检查 `state`，并使用客户端密钥和 PKCE 验证器交换代码。它验证 ID 令牌（包括 `nonce`）。它返回一个有效期为六十秒的一次性票据。
5. 页面将 `password=oidc:ticket:<id>` 发送到 `/users/_login`。引擎再次验证令牌，解析引擎用户并分配角色。会话、登录审计事件和任何第二因素与密码登录相同。

适用于此流程的规则：

- 只有票据是登录凭证。引擎拒绝直接发送到 `/users/_login` 的 ID 令牌。
- 返回路由必须是 Web 管理器上最多 2048 个字符的路径。任何其他值将用户返回到 `/`。
- 代码交换使用 `client_secret_basic`。仅当提供者的发现文档列出 `client_secret_post` 而非 `client_secret_basic` 时才使用 `client_secret_post`。
- 引擎将 `/callback` 限制为每分钟每个客户端六十个请求，总共每分钟六百个请求。客户端是 `X-Forwarded-For` 头中的第一个地址（如果存在），否则为对端地址。`/public` 和 `/start` 没有限制。
- 在拒绝的尝试后，Web 管理器会向提供者请求 `prompt=login`，使提供者再次要求凭据。

### 令牌验证

- Discovery URL、`jwks_uri`、授权端点和令牌端点必须使用 HTTPS。仅对 `localhost` 接受纯 HTTP。
- 引擎将发现文档保留 `jwks-cache-ttl-seconds` 时间。
- 引擎将密钥集保留 `jwks-cache-ttl-seconds` 时间。它以十秒超时和一兆字节限制获取密钥集。未知的密钥 ID 最多每三十秒触发一次新的获取。
- 令牌算法必须在 `allowed-algorithms` 中。引擎从不接受 `HS*` 或 `none`。
- `iss` 必须等于发现文档的发行者。`aud` 必须包含客户端 ID。具有多个受众的令牌必须携带 `azp` 等于客户端 ID。
- `exp`、`nbf` 和 `iat` 根据引擎时钟检查，容差为 `clock-skew-seconds`。`iat` 最多不能超过 `max-token-age-seconds`。
- 引擎在 `max-token-age-seconds` 加 `clock-skew-seconds` 的时间内记住每个已接受的令牌，并拒绝第二次使用。此记忆存在于引擎进程中。重启会清除它，引擎节点之间不共享。

## 账户

- 引擎用户名是 `username-claim` 值，经过规范化 (NFKC)、小写处理并添加 `username-prefix` 前缀。结果必须匹配 `a-z 0-9 . _ @ + : -`，最多 128 个字符。
- 首次登录时，引擎将账户绑定到 `issuer#subject` 并将绑定存储为用户偏好 `oidc.subject`。
- 没有绑定的现有账户会被拒绝，除非 `linked-accounts` 列出了完全匹配的 `issuer#subject`。
- `issuer#subject` 与账户绑定不同的登录会被拒绝。
- 当提供者更改用户的用户名时，绑定的账户会采用新名称。当新名称属于不同的账户时，登录会被拒绝。
- 当一个 `issuer#subject` 绑定到两个账户时，登录会被拒绝，直到管理员解决重复问题。
- 每次登录时，引擎将电子邮件、姓名和组织声明复制到账户（如果不同）。姓名声明在最后一个空格处拆分为名字和姓氏。
- SSO 账户没有首次登录设置步骤。引擎在每次登录时清除 `firstlogin` 偏好。
- 绑定到提供者主题的账户在 SSO 活动期间拒绝本地密码。消息为 `This account signs in through SSO.`。`linked-accounts` 中的账户保留其本地密码。当 SSO 关闭时（策略禁用或紧急开关设置），所有账户都可以使用本地密码。
- 以 `oidc:` 开头的本地密码被视为 SSO 凭据并被拒绝。

### 即时用户

`jit.enabled=true` 在首次登录时创建引擎用户。账户从声明中获取电子邮件、姓名和组织、`issuer#subject` 绑定，且没有引擎密码。

> **未安装 RBAC 时，每个引擎用户都拥有完全管理员访问权限。** 引擎没有自己的权限模型。当 `jit.enabled=true` 且没有 RBAC 扩展时，提供者为其颁发令牌的每个人在首次登录时都会成为完全管理员。扩展不会拒绝此配置。请先安装 RBAC，或在提供者处限制哪些用户可以接收此客户端的令牌。安装 RBAC 后，`roles.default` 为必需项，并限制新用户可以执行的操作。

## 角色

角色分配需要 RBAC 扩展。引擎为每个用户分配一个角色。

`roles.claim` 命名携带角色值的声明。点分路径（如 `realm_access.roles`）可以进入嵌套声明。引擎首先尝试精确的顶级名称。列表声明每个元素给出一个值。文本声明在逗号处拆分，或在没有逗号时在空白处拆分。

引擎按以下顺序解析角色：

1. `roles.map` 中第一个键等于声明值的条目，按声明顺序。
2. 当 `roles.infer=true` 时，第一个等于现有 RBAC 角色名称的声明值。
3. `roles.default`。

除非声明经过审查，否则保持 `roles.infer=false`。任何匹配的值（包括 `Administrator`）都会授予该角色。

`roles.sync` 控制引擎何时分配角色：`always` 在每次登录时、`jit-only` 在创建账户时、`never` 不分配。

当策略启用、安装了 RBAC 且 `roles.sync` 不是 `never` 时，`roles.default` 为必需项。检查的是该键有值，而不是角色存在。当解析的角色不存在时，引擎记录 `OIDC role '…' does not exist; leaving role unchanged` 并保持当前角色。

引擎从不降级最后一个管理员。RBAC 中的失败从不阻止登录。

引擎在 DEBUG 级别记录每个角色决策。在引擎的 log4j2 配置中将日志记录器 `org.openintegrationengine.plugins.oidc` 设置为 DEBUG，以查看读取了哪个声明及其携带的值。

### 角色声明必须在 ID 令牌中

引擎从 ID 令牌读取角色。大多数提供者默认将角色放在访问令牌中，除非另行配置。使用该配置时，每个用户都会获得默认角色。

- **Keycloak：**`roles` 客户端作用域将 `realm_access.roles` 和 `resource_access.<client-id>.roles` 写入访问令牌。在这些映射器上启用 **Add to ID token**，或在客户端上添加映射器。使用 *User Client Role* 或 *User Realm Role* 处理角色。使用 *Group Membership* 并关闭 **Full group path** 处理组。将令牌声明名称设置为 `groups`，选择 **Multivalued**，并启用 **Add to ID token**。保持 `roles.claim` 为 `groups`。每个声明名称使用一个映射器。
- **Microsoft Entra ID：** 在 *Token configuration* 下，将 `groups`（对象 ID，每个 ID 一个 `roles.map` 条目）或应用 `roles` 添加到 ID 令牌。
- **Okta：** 在授权服务器中将 `groups` 声明添加到 ID 令牌。
- **AWS Cognito：** ID 令牌携带 `cognito:groups`。将 `roles.claim` 设置为 `cognito:groups`。

### 被拒绝的策略

当存储的策略验证失败时，引擎启动但策略未生效。`/public` 报告 `configured:false`。登录页面不提供 SSO。登录尝试会收到 `SSO is disabled on this engine.`。选项卡显示存储的值和带有原因的横幅。日志中有 `OIDC authentication is not configured: <reason>`。使用本地管理员账户在选项卡中更正策略。当没有本地管理员时，使用运维覆盖设置值，例如 `OIE_OIDC_ROLES_DEFAULT=<role>`。

## 策略键

每个键都存在于引擎数据库中，并在 **设置 → OIDC 认证** 下编辑。每个键都可以通过运维覆盖固定。

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `false` | 策略的主开关。 |
| `discovery-url` | *(空)* | 提供者的 `.well-known/openid-configuration`。启用时必需。HTTPS，或 `localhost` 的 HTTP。 |
| `client-id` | *(空)* | 引擎期望接收令牌的客户端。针对 `aud` 检查。启用时必需。 |
| `client-secret` | *(空)* | 机密客户端的密钥，用于代码交换。存储后显示为掩码。启用时必需。 |
| `web-administrator-url` | *(空)* | 浏览器打开 Web 管理器的地址，例如 `https://oie-admin.example` 或 `https://engine.example:8443/oie-webadmin`。不含查询、片段或凭据的基本 URL。HTTPS，或 `localhost` 的 HTTP。重定向 URI 为 `<this>/oidc/callback`。启用时必需。 |
| `provider-label` | `SSO` | 登录按钮显示为“使用 `<label>` 登录”。 |
| `auto-redirect` | `false` | 立即将访客发送到提供者而不是显示按钮。本地登录仍然可用。 |
| `scopes` | `openid profile email` | 从提供者请求的作用域，以空格或逗号分隔。始终包含 `openid`。 |
| `username-claim` | `preferred_username` | 成为引擎用户名的声明。 |
| `username-prefix` | *(空)* | 放在规范化用户名前面的文本。必须匹配 `a-z 0-9 . _ @ + : -`。 |
| `allowed-algorithms` | `RS256,RS384,RS512,ES256,ES384,ES512` | 接受的签名算法。从不接受 `HS*`。 |
| `clock-skew-seconds` | `60` | `exp`、`nbf` 和 `iat` 相对于引擎时钟的容差。 |
| `max-token-age-seconds` | `300` | 最旧可接受的 `iat`。加上时钟偏差后，为已接受令牌的记忆时间。 |
| `jwks-cache-ttl-seconds` | `300` | 发现文档和密钥集的重用时间。 |
| `jit.enabled` | `false` | 在首次登录时创建引擎用户。请先阅读*即时用户*章节。 |
| `jit.email-claim` | `email` | 复制到用户电子邮件的声明。 |
| `jit.name-claim` | `name` | 拆分为名字和姓氏的声明。 |
| `jit.organization-claim` | `organization` | 复制到用户组织的声明。 |
| `linked-accounts` | *(空)* | `engine-user=issuer#subject` 条目，以逗号分隔。现有账户通过 SSO 登录的唯一方式。 |
| `roles.claim` | `groups` | 携带角色值的声明。点分路径进入嵌套声明。 |
| `roles.map` | *(空)* | `claim-value=RBAC 角色` 条目，以逗号分隔。声明顺序中的第一个匹配获胜。 |
| `roles.default` | *(空)* | 声明不匹配任何内容的用户的角色。启用并安装 RBAC 时必需，除非 `roles.sync=never`。 |
| `roles.sync` | `always` | `always`、`jit-only` 或 `never`。参见*角色*章节。 |
| `roles.infer` | `false` | 同时接受等于现有 RBAC 角色名称的声明值。 |

## 限制

- 未实现 RP 发起的登出和前端通道登出。从引擎登出不会结束提供者会话。根据提供者的会话策略设置引擎的 `server.api.sessionmaxinactiveinterval`。
- 仅限机密客户端。引擎持有客户端密钥。不支持仅使用 PKCE 的公共客户端。
- 每个引擎一个身份提供者。引擎加载一个授权插件。
- 每个用户一个角色。`roles.map` 给出第一个匹配，而非并集。
- 重放记忆按引擎进程管理。参见*令牌验证*章节。
- 在提供者处删除用户会阻止下次登录。它不会禁用或删除引擎账户。请同时删除引擎用户。
