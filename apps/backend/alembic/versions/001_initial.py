"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-03-16
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # === ENUMS ===
    admin_role = postgresql.ENUM("superadmin", "admin", name="adminrole", create_type=False)
    admin_role.create(op.get_bind(), checkfirst=True)

    node_status = postgresql.ENUM("online", "offline", "degraded", "maintenance", name="nodestatus", create_type=False)
    node_status.create(op.get_bind(), checkfirst=True)

    region_profile = postgresql.ENUM("moscow", "russia-regions", "china", "iran", "universal", name="regionprofile", create_type=False)
    region_profile.create(op.get_bind(), checkfirst=True)

    protocol = postgresql.ENUM("vless", "vmess", "trojan", "shadowsocks", "hysteria2", "tuic", "wireguard", name="protocol", create_type=False)
    protocol.create(op.get_bind(), checkfirst=True)

    core = postgresql.ENUM("xray", "singbox", name="core", create_type=False)
    core.create(op.get_bind(), checkfirst=True)

    connection_mode = postgresql.ENUM("direct", "cdn", "domain-fronting", name="connectionmode", create_type=False)
    connection_mode.create(op.get_bind(), checkfirst=True)

    sub_status = postgresql.ENUM("active", "expired", "disabled", "limited", name="substatus", create_type=False)
    sub_status.create(op.get_bind(), checkfirst=True)

    payment_provider = postgresql.ENUM("yukassa", "cryptobot", "telegram_stars", "stripe", "manual", name="paymentprovider", create_type=False)
    payment_provider.create(op.get_bind(), checkfirst=True)

    payment_status = postgresql.ENUM("pending", "completed", "failed", "refunded", name="paymentstatus", create_type=False)
    payment_status.create(op.get_bind(), checkfirst=True)

    # === admins ===
    op.create_table(
        "admins",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", postgresql.ENUM("superadmin", "admin", name="adminrole", create_type=False), server_default=sa.text("'admin'")),
        sa.Column("totp_secret", sa.String(64), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index("ix_admins_username", "admins", ["username"])

    # === nodes ===
    op.create_table(
        "nodes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("host", sa.String(255), nullable=False),
        sa.Column("port", sa.Integer(), server_default="22"),
        sa.Column("country", sa.String(2), nullable=False),
        sa.Column("city", sa.String(100), server_default=sa.text("''")),
        sa.Column("flag", sa.String(10), server_default=sa.text("''")),
        sa.Column("cores_config", sa.JSON(), server_default=sa.text("'{}'")),
        sa.Column("max_users", sa.Integer(), server_default=sa.text("0")),
        sa.Column("traffic_limit", sa.Integer(), server_default=sa.text("0")),
        sa.Column("sni_domains", sa.JSON(), server_default=sa.text("'[]'")),
        sa.Column("cdn_domain", sa.String(255), server_default=sa.text("''")),
        sa.Column("certificate_type", sa.String(20), server_default=sa.text("'reality'")),
        sa.Column("status", postgresql.ENUM("online", "offline", "degraded", "maintenance", name="nodestatus", create_type=False), server_default=sa.text("'offline'")),
        sa.Column("last_heartbeat", sa.DateTime(timezone=True), nullable=True),
        sa.Column("region_profile", postgresql.ENUM("moscow", "russia-regions", "china", "iran", "universal", name="regionprofile", create_type=False), server_default=sa.text("'universal'")),
        sa.Column("agent_token", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("agent_token"),
    )

    # === plans ===
    op.create_table(
        "plans",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default=sa.text("'RUB'")),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.Column("traffic_limit", sa.BigInteger(), server_default=sa.text("0")),
        sa.Column("device_limit", sa.Integer(), server_default=sa.text("0")),
        sa.Column("features", sa.JSON(), server_default=sa.text("'{}'")),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )

    # === users ===
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=True),
        sa.Column("telegram_username", sa.String(100), nullable=True),
        sa.Column("sub_token", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("created_by", sa.String(100), server_default=sa.text("'admin'")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
        sa.UniqueConstraint("telegram_id"),
        sa.UniqueConstraint("sub_token"),
    )
    op.create_index("ix_users_username", "users", ["username"])
    op.create_index("ix_users_sub_token", "users", ["sub_token"])

    # === inbounds ===
    op.create_table(
        "inbounds",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("node_id", sa.Uuid(), nullable=False),
        sa.Column("protocol", postgresql.ENUM("vless", "vmess", "trojan", "shadowsocks", "hysteria2", "tuic", "wireguard", name="protocol", create_type=False), nullable=False),
        sa.Column("core", postgresql.ENUM("xray", "singbox", name="core", create_type=False), nullable=False),
        sa.Column("transport_config", sa.JSON(), server_default=sa.text("'{}'")),
        sa.Column("port", sa.Integer(), nullable=False),
        sa.Column("connection_mode", postgresql.ENUM("direct", "cdn", "domain-fronting", name="connectionmode", create_type=False), server_default=sa.text("'direct'")),
        sa.Column("tag", sa.String(100), nullable=False),
        sa.Column("max_connections", sa.Integer(), server_default=sa.text("0")),
        sa.Column("sniffing", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("fallback_config", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["node_id"], ["nodes.id"], ondelete="CASCADE"),
    )

    # === subscriptions ===
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("plan_id", sa.Uuid(), nullable=True),
        sa.Column("status", postgresql.ENUM("active", "expired", "disabled", "limited", name="substatus", create_type=False), server_default=sa.text("'active'")),
        sa.Column("start_date", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("expiry_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("traffic_limit", sa.BigInteger(), server_default=sa.text("0")),
        sa.Column("traffic_used", sa.BigInteger(), server_default=sa.text("0")),
        sa.Column("device_limit", sa.Integer(), server_default=sa.text("0")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"], ondelete="SET NULL"),
    )

    # === payments ===
    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("plan_id", sa.Uuid(), nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default=sa.text("'RUB'")),
        sa.Column("provider", postgresql.ENUM("yukassa", "cryptobot", "telegram_stars", "stripe", "manual", name="paymentprovider", create_type=False), nullable=False),
        sa.Column("provider_payment_id", sa.String(255), nullable=True),
        sa.Column("status", postgresql.ENUM("pending", "completed", "failed", "refunded", name="paymentstatus", create_type=False), server_default=sa.text("'pending'")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["plan_id"], ["plans.id"], ondelete="SET NULL"),
    )

    # === user_access ===
    op.create_table(
        "user_access",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("node_id", sa.Uuid(), nullable=True),
        sa.Column("inbound_id", sa.Uuid(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["node_id"], ["nodes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["inbound_id"], ["inbounds.id"], ondelete="CASCADE"),
    )

    # === user_traffic ===
    op.create_table(
        "user_traffic",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("node_id", sa.Uuid(), nullable=False),
        sa.Column("inbound_id", sa.Uuid(), nullable=True),
        sa.Column("upload", sa.BigInteger(), server_default=sa.text("0")),
        sa.Column("download", sa.BigInteger(), server_default=sa.text("0")),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["node_id"], ["nodes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["inbound_id"], ["inbounds.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_user_traffic_user_id", "user_traffic", ["user_id"])
    op.create_index("ix_user_traffic_timestamp", "user_traffic", ["timestamp"])

    # === node_metrics ===
    op.create_table(
        "node_metrics",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("node_id", sa.Uuid(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("cpu", sa.Float(), server_default=sa.text("0.0")),
        sa.Column("ram", sa.Float(), server_default=sa.text("0.0")),
        sa.Column("bandwidth_up", sa.BigInteger(), server_default=sa.text("0")),
        sa.Column("bandwidth_down", sa.BigInteger(), server_default=sa.text("0")),
        sa.Column("connections", sa.Integer(), server_default=sa.text("0")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["node_id"], ["nodes.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_node_metrics_node_id", "node_metrics", ["node_id"])
    op.create_index("ix_node_metrics_timestamp", "node_metrics", ["timestamp"])

    # === audit_log ===
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("admin_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(50), nullable=False),
        sa.Column("target_id", sa.String(100), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["admin_id"], ["admins.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_audit_log_created_at", "audit_log", ["created_at"])

    # === config_templates ===
    op.create_table(
        "config_templates",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("protocol", sa.String(30), nullable=False),
        sa.Column("core", sa.String(10), nullable=False),
        sa.Column("transport", sa.String(20), nullable=False),
        sa.Column("security", sa.String(20), nullable=False),
        sa.Column("connection_mode", sa.String(20), nullable=False),
        sa.Column("server_template", sa.JSON(), nullable=False),
        sa.Column("client_template", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )


def downgrade() -> None:
    op.drop_table("config_templates")
    op.drop_table("audit_log")
    op.drop_table("node_metrics")
    op.drop_table("user_traffic")
    op.drop_table("user_access")
    op.drop_table("payments")
    op.drop_table("subscriptions")
    op.drop_table("inbounds")
    op.drop_table("users")
    op.drop_table("plans")
    op.drop_table("nodes")
    op.drop_table("admins")

    for enum_name in [
        "paymentstatus", "paymentprovider", "substatus",
        "connectionmode", "core", "protocol",
        "regionprofile", "nodestatus", "adminrole",
    ]:
        postgresql.ENUM(name=enum_name).drop(op.get_bind(), checkfirst=True)
