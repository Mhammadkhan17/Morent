from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str
    database_url_unpooled: str

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    frontend_origin: str = "http://localhost:3000"
    auth_base_url: str = "http://localhost:3000"

    owner_email: str = ""


settings = Settings()
