import base64
import json
import random
import time
import os
import math
from typing import List
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
            # print(f"Image {image_path} is already smaller than the max_dim. Skipping resize.")
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


def concat_jsonl(input_files: List[str], output_file: str):
    """
    Combine multiple JSONL files into a single output file.
    """
    print(f"Combining {len(input_files)} JSONL files into {output_file}")

    # Open the output file in write mode
    with open(output_file, "w", encoding="utf-8") as outfile:
        for file in input_files:
            with open(file, "r", encoding="utf-8") as infile:
                for line in infile:
                    outfile.write(line)

    print(f"Combined {len(input_files)} JSONL files into {output_file}")


def split_jsonl_by_size(
    input_file: str, output_dir: str, max_size: int = FILE_SIZE_LIMIT
):
    """
    Split the JSONL file into multiple files.
    """
    assert isinstance(max_size, int), (
        f"max_size must be an integer, but got {type(max_size)}"
    )
    assert os.path.exists(input_file), f"Input file {input_file} does not exist."
    assert os.path.isfile(input_file), f"Input file {input_file} is not a file."
    assert os.path.exists(output_dir), f"Output directory {output_dir} does not exist."
    assert os.path.isdir(output_dir), (
        f"Output directory {output_dir} is not a directory."
    )
    assert os.listdir(output_dir) == [], (
        f"Output directory {output_dir} is not empty. Please choose a different directory or delete the existing files."
    )
    assert input_file.endswith(".jsonl"), (
        f"Input file {input_file} is not a JSONL file."
    )

    # Check the size of the input file
    if os.path.getsize(input_file) > max_size:
        num_splits = math.ceil(os.path.getsize(input_file) / max_size)
    else:
        print(
            f"Input file {input_file} is not larger than {max_size / MEBIBYTE:.2f} MB."
        )
        return None

    # Read the input file
    with open(input_file, "r") as f:
        all_data = [json.loads(line) for line in f]

    # Create the iterator of indices
    ls_indices = list(range(0, len(all_data), len(all_data) // num_splits))
    if len(ls_indices) == num_splits:
        ls_indices.append(len(all_data))
    elif len(ls_indices) == num_splits + 1:
        ls_indices[-1] = len(all_data)
    else:
        raise ValueError(
            f"len(ls_indices) must be equal to num_splits + 1, but got {len(ls_indices)}"
        )
    assert len(ls_indices) == num_splits + 1, (
        f"len(ls_indices) must be equal to num_splits + 1, but got {len(ls_indices)}"
    )

    # Split the data into multiple files
    for i in range(num_splits):
        with open(os.path.join(output_dir, f"split_{i}.jsonl"), "w") as f:
            for item in all_data[ls_indices[i] : ls_indices[i + 1]]:
                f.write(json.dumps(item) + "\n")

    return num_splits


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


class OpenAIClientRunner:
    def __init__(self, model="gpt-4.1-nano"):
        self.model = model
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        logger = logging.getLogger(__name__)
        logger.info(
            f"{self.__class__.__name__}: OpenAIClientRunner : Using model: {self.model}"
        )

    def call_gpt_response(self, txt_prompt, base64_image):
        response = self.client.responses.create(
            model=self.model,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": txt_prompt},
                        {
                            "type": "input_image",
                            "image_url": f"data:image/jpeg;base64,{base64_image}",
                        },
                    ],
                }
            ],
        )
        return response.output_text
    
    def call_gpt_chat_stream(self, prompt, max_tokens: int = 1024):
        """Streaming version"""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=prompt,
            max_tokens=max_tokens,
            stream=True,  # ← Enable streaming
        )
        return response

    def call_gpt_chat(self, prompt, max_tokens: int = 1024):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=prompt,
            max_tokens=max_tokens,
        )
        # max_tokens: Specifies the maximum number of tokens to generate in the response. If the response would be longer than this number of tokens, it will be truncated.
        return response.choices[0].message.content

    @retry_with_exponential_backoff
    def _call_gpt_retry(self, prompt, max_tokens: int = 1024, stream: bool = False):
        if stream:
            return self.call_gpt_chat_stream(prompt, max_tokens=max_tokens)
        else:
            return self.call_gpt_chat(prompt, max_tokens=max_tokens)

    def __call__(self, prompt, max_tokens: int = 1024, stream: bool = False):
        return self._call_gpt_retry(prompt, max_tokens=max_tokens, stream = stream)


if __name__ == "__main__":
    # Load environment variables from .env file
    load_dotenv()
