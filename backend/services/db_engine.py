from sqlalchemy import create_engine


def build_engine(database_url, **kwargs):
    """Replace stale connections at checkout; recycle by age, not idle time."""
    return create_engine(
        database_url,
        pool_pre_ping=True,
        pool_recycle=300,
        hide_parameters=True,
        **kwargs,
    )
