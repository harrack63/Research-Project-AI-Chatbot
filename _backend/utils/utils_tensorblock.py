import os
import time
import random
import base64
import logging

from dotenv import load_dotenv
import openai
from PIL import Image, ImageOps
from io import BytesIO


MINITES = 60
HOURS = 3600
MEBIBYTE = 1024 * 1024
FILE_SIZE_LIMIT = int(209715200 * 0.99)


def encode_image_to_base64(image_path, resize: bool = False, **kwargs):
    """
    Encode image to base64
    """
    if not resize:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")
    else:
        return _resize_and_encode_image(image_path, **kwargs)


def _resize_and_encode_image(
    image_path: str,
    max_dim: int = 512,
    pad_to_square: bool = False,
    pad_color: tuple = (255, 255, 255),
) -> str:
    """
    Resize image with aspect ratio preserved, optionally pad to square,
    and encode to base64 JPEG format.

    Args:
        image_path (str): Path to input image.
        max_dim (int): Maximum width/height for resizing.
        pad_to_square (bool): Whether to pad the image to square shape.
        pad_color (tuple): RGB color for padding background.

    Returns:
        str: Base64-encoded JPEG image.
    """
    # Open and resize image with aspect ratio preserved
    with Image.open(image_path).convert("RGB") as img:
        # directly encode the image to base64 without resizing if the image is already smaller than the max_dim
        if img.width <= max_dim and img.height <= max_dim:
            return encode_image_to_base64(image_path)

        img.thumbnail((max_dim, max_dim), Image.LANCZOS)

        # Optional: pad to square
        if pad_to_square:
            img = ImageOps.pad(img, size=(max_dim, max_dim), color=pad_color)

        # Encode to base64
        with BytesIO() as buffer:
            img.save(buffer, format="JPEG")
            img_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return img_b64


# define a retry decorator
def retry_with_exponential_backoff(
    func,
    initial_delay: float = 1,
    exponential_base: float = 2,
    jitter: bool = True,
    max_retries: int = 10,
    errors: tuple = (openai.RateLimitError,),
):
    """Retry a function with exponential backoff."""

    def wrapper(*args, **kwargs):
        # Initialize variables
        num_retries = 0
        delay = initial_delay

        # Loop until a successful response or max_retries is hit or an exception is raised
        while True:
            try:
                return func(*args, **kwargs)

            # Retry on specific errors
            except errors as _:
                # Increment retries
                num_retries += 1

                # Check if max retries has been reached
                if num_retries > max_retries:
                    raise Exception(
                        f"Maximum number of retries ({max_retries}) exceeded."
                    )

                # Increment the delay
                delay *= exponential_base * (1 + jitter * random.random())

                # Sleep for the delay
                time.sleep(delay)

            # Raise exceptions for any errors not specified
            except Exception as e:
                raise e

    return wrapper


class TensorblockClientRunner:
    """
    TensorBlock is a platform allowing you to call other LLMs using OpenAI API.
    https://docs.tensorblock.com/api-reference/chat
    """

    def __init__(self, model="OpenAI/OpenAI/gpt-5-mini"):
        self.model = model
        
        load_dotenv('../.env.local')
        forge_key = os.getenv("FORGE_KEY")
        
        print(f"DEBUG: FORGE_KEY from env: {forge_key[:30] if forge_key else 'NOT SET'}...")
        print(f"DEBUG: FORGE_KEY length: {len(forge_key) if forge_key else 0}")
        
        if not forge_key:
            raise ValueError("FORGE_KEY not set in environment")
        
        self.client = openai.OpenAI(
            base_url="https://api.forge.tensorblock.co/v1",
            api_key=os.getenv("FORGE_KEY")
        )
        logger = logging.getLogger(__name__)
        logger.info(
            f"{self.__class__.__name__}: TensorblockClientRunner: Using model: {self.model}"
        )

    def call_gpt_response(self, prompt, max_tokens: int = 1024):
        response = self.client.responses.create(
            model=self.model,
            input=prompt,
            max_completion_tokens=max_tokens,
        )
        return response.output_text

    def call_gpt_chat(self, prompt, max_tokens: int = 1024):
        """
        max_tokens: Specifies the maximum number of tokens to generate in the response. If the response would be longer than this number of tokens, it will be truncated.
        """
        response = self.client.chat.completions.create(
            model=self.model,
            messages=prompt,
            max_completion_tokens=max_tokens,
        )
        return response.choices[0].message.content
    
    def call_gpt_chat_stream(self, prompt, max_tokens: int = 1024): 
        """Streaming version"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=prompt,
            max_completion_tokens=max_tokens,
            stream=True,  # ← Enable streaming
        )
        return response

    @retry_with_exponential_backoff
    def _call_gpt_retry(self, prompt, max_tokens: int = 1024, stream: bool = False):
        if stream:
            return self.call_gpt_chat_stream(prompt, max_tokens=max_tokens)
        else:
            return self.call_gpt_chat(prompt, max_tokens=max_tokens)

    def __call__(self, prompt, max_tokens: int = 1024, stream: bool = False):
        return self._call_gpt_retry(prompt, max_tokens=max_tokens, stream=stream)


if __name__ == "__main__":
    # Load environment variables from .env file
    load_dotenv()
