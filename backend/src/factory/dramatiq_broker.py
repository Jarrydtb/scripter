import dramatiq
from dramatiq.brokers.rabbitmq import RabbitmqBroker
from periodiq import PeriodiqMiddleware
from .conf import config

rabbitmq_broker = RabbitmqBroker(host=config.BROKER_URL, port=5672)
rabbitmq_broker.add_middleware(PeriodiqMiddleware())
dramatiq.set_broker(rabbitmq_broker)