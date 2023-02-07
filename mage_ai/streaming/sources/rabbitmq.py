from mage_ai.shared.config import BaseConfig
from mage_ai.streaming.sources.base import BaseSource
from dataclasses import dataclass
from typing import Callable, Dict
from collections import namedtuple
import pika
from pika.exceptions import AMQPConnectionError

@dataclass
class ConsumeConfig:
    auto_ack: bool = False
    exclusive: bool = False
    inactivity_timeout: float = None





@dataclass
class PikaConfig(BaseConfig):
    connection_host: str
    connection_port: int
    queue_name: str
    configure_consume: bool = False
    username: str = 'guest'
    password: str = 'guest'
    amqp_url_virtual_host: str = r'%2f'
    consume_config = ConsumeConfig = None

    @classmethod
    def parse_config(self, config: Dict) -> Dict:
        consume_config = config.get('consume_config')
        if consume_config is not None and type(consume_config) is dict:
            config['consume_config'] = ConsumeConfig(**consume_config)
        return config

    


class PikaSource(BaseSource):
    config_class = PikaConfig


    def init_client(self):

        self._print(f'Starting to initialize consumer for queue {self.config.queue_name}')

        try:
            
            generated_url = f"amqp://{self.config.username}:{self.config.password}@{self.config.connection_host}:{self.config.connection_port}/{self.config.amqp_url_virtual_host}"
            self._print(f'Trying to connect on {generated_url}')
            self.create_connection = pika.BlockingConnection(pika.URLParameters(f"amqp://guest:guest@{self.config.connection_host}:{self.config.connection_port}/%2f"))
            
            self._print('Connected on broker')
        

            self.channel = self.create_connection.channel()


        except AMQPConnectionError:
            print('AMQP Connection Error, please check your broker connection or configuration')
            raise AMQPConnectionError
        except Exception as e:
            print(e)
            raise e

        
        



    def read(self, handler:Callable):
        pass

    def batch_read(self,handler:Callable):

        self._print('Start consuming messages.')
        
        #using namedtuple for better usage on transformer blocks

        message_tuple = namedtuple('Payload',['method','properties','body'])
        if self.config.configure_consume == True:
            for method , properties, body in self.channel.consume(self.config.queue_name,self.config.consume_config.auto_ack,self.config.consume_config.exclusive,arguments=None,inactivity_timeout=self.config.consume_config.inactivity_timeout):
                full_message = message_tuple(method,properties,body)
                self.__print_message(full_message)
                handler(full_message,**{'channel':self.channel})
        else:
            for method, properties, body in self.channel.consume(self.config.queue_name):
                full_message = message_tuple(method,properties,body)
                self.__print_message(full_message)
                handler(full_message,**{'channel':self.channel})

    def __print_message(self, method):
        self._print(f'Received message {method}')
        



