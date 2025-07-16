import base64
import json
import random
import time
import os
import math
from typing import List
import time
import logging

from dotenv import load_dotenv
import openai
from tqdm import tqdm
from PIL import Image, ImageOps
from io import BytesIO
import argparse

# Load environment variables from .env file
load_dotenv()

# Set OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")


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
        self.client = openai.OpenAI()
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

    def call_gpt_chat(self, prompt, max_tokens: int = 1024):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=prompt,
            max_tokens=max_tokens,
        )
        # max_tokens: Specifies the maximum number of tokens to generate in the response. If the response would be longer than this number of tokens, it will be truncated.
        return response.choices[0].message.content

    @retry_with_exponential_backoff
    def _call_gpt_retry(self, prompt, max_tokens: int = 1024):
        return self.call_gpt_chat(prompt, max_tokens=max_tokens)

    def __call__(self, prompt, max_tokens: int = 1024):
        return self._call_gpt_retry(prompt, max_tokens=max_tokens)


class OpenAIBatchRunner:
    """
    https://platform.openai.com/docs/guides/batch
    """

    response_api_url = "/v1/responses"
    chatcompletion_api_url = "/v1/chat/completions"
    embedding_api_url = "/v1/embeddings"
    completion_api_url = "/v1/completions1"

    def __init__(self, model="gpt-4.1-nano", workdir: str = None):
        self.model = model  # The model to use for the batch job
        self.workdir = workdir  # The working directory for the batch job. The default is the current directory.
        # The input batch file and the output batch file will be saved in this directory.
        if self.workdir is None:
            input(
                "WARNING: The workdir is None, which is normally a mistake. If you REALLY REALLY want to use it, please press Enter..."
            )

        if not os.path.exists(self.workdir):
            # If the directory does not exist, create it.
            print(f"Directory {self.workdir} does not exist. Creating it.")
            os.makedirs(self.workdir, exist_ok=True)
        elif os.listdir(self.workdir):
            # If the directory exists, check if it is empty.
            raise FileExistsError(
                f"Directory {self.workdir} already exists and is not empty. Please choose a different directory or delete the existing files."
            )
        else:
            # If the directory exists and is empty, do nothing.
            print(
                f"Directory {self.workdir} already exists and is empty. Proceeding with the batch job."
            )
            pass

        self.__batch = []  # List to store batch items

        self.endpoint = (
            self.chatcompletion_api_url
        )  # The endpoint for the batch job. The default is the chat completion API.

        # self.client = openai.OpenAI()

        self.path_log_file = os.path.join(
            self.workdir, "log.log"
        )  # The auto-generated log file for the batch job.

        self.path_all_batch_input_file = os.path.join(self.workdir, "batchinput.jsonl")
        self.path_all_batch_output_file = os.path.join(
            self.workdir, "batch_output.jsonl"
        )

        # The following variables are used to store the batch input file and the batch job object.
        self.path_dir_splits = os.path.join(self.workdir, "split_batch")
        self.batch_input_file_obj = None  # The batch input file object returned by the OpenAI API client.files.create() method.
        self.batch_input_file_id = None  # The ID of the batch input file returned by the OpenAI API client.files.create() method.
        self.batch_obj = None  # The batch job object returned by the OpenAI API client.batches.create() method.

        # The following variables are used to store the batch input files and the batch job objects in case the batch input file is too large.
        self.split_num = None
        self.ls_batch_input_files = None
        self.ls_batch_output_files = None
        self.ls_batch_obj = None

    def _log(self, message):
        """Helper method to log messages to both console and file"""
        print(message)
        with open(self.path_log_file, "a") as f:
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"[{timestamp}] {message}\n")

    def batch_add(self, custom_id: str, messages: list, max_tokens: int = None):
        """
        messages: The messages to send to the model, following the official OpenAI API format.
        demo:
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        The batch input file is a JSONL file that contains the requests you want to make. Each line in the file is a separate request.
        Create a `.jsonl` file with the following format:
            {"custom_id": "request-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-3.5-turbo-0125", "messages": [{"role": "system", "content": "You are a helpful assistant."},{"role": "user", "content": "Hello world!"}],"max_tokens": 1000}}
            {"custom_id": "request-2", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "gpt-3.5-turbo-0125", "messages": [{"role": "system", "content": "You are an unhelpful assistant."},{"role": "user", "content": "Hello world!"}],"max_tokens": 1000}}
        """
        item = {
            "custom_id": custom_id,
            "method": "POST",
            "url": self.endpoint,
            "body": {
                "model": self.model,
                "messages": messages,
                "max_tokens": max_tokens,
            },
        }
        self.__batch.append(item)

    def batch_run(self, description=""):
        """
        Run the batch job
        """
        # Step 1. Create a batch input file from the `self.__batch` list
        self._generate_local_batch_input_file()

        # Step 1.1 Validate the local batch input file
        self._validate_local_batch_input_file()

        # Step 2. Upload your batch input file and Create the batch job
        if self.split_num == 1:
            # If the batch input file is not split, create a single batch job using the legacy API.
            self._create_batch_job(description=description)

            self.alfred(
                self.batch_obj.id,
                save_path=self.ls_batch_output_files[0],
                workdir=self.workdir,
            )
        else:
            # If the batch input file is split, create a batch job for each split.
            for split_idx in range(self.split_num):
                self._create_single_batch_job(split_idx, description=description)

                # Monitor the batch job status and download the output file when it is completed.
                # The next batch job can only be created after the previous batch job is completed.
                self.alfred(
                    self.ls_batch_obj[split_idx].id,
                    save_path=self.ls_batch_output_files[split_idx],
                    workdir=self.workdir,
                )

            # Concatenate the output files into a single file
            concat_jsonl(self.ls_batch_output_files, self.path_all_batch_output_file)

            # # Print the batch job IDs
            # msg = "+" * 20 + " Batch Job IDs Summary " + "+" * 20 + "\n"
            # for split_idx in range(self.split_num):
            #     msg += f"Batch job {split_idx} ID: {self.ls_batch_obj[split_idx].id}\n"
            # msg += "-" * (40 + len(" Batch Job IDs Summary ")) + "\n"
            # self._log(msg)

            # # Save the batch job IDs to a json file
            # with open(os.path.join(self.workdir, "split_batch_job_ids.json"), "w") as f:
            #     dct_batch_obj_ids = {
            #         idx: self.ls_batch_obj[idx].id for idx in range(self.split_num)
            #     }
            #     json.dump(dct_batch_obj_ids, f)

        # # Monitor the batch job status and download the output file when it is completed
        # self.alfred(
        #     self.batch_obj.id,
        #     save_path=self.path_output_file,
        # )

    def batch_run_resume(self, description=""):
        """
        Resume the batch job for split batch jobs. This function is only used for the cases that the batch job is split into multiple files and the batch job is not completed and accidently terminated in the middle.
        """
        # Load the batch job distribution
        with open(os.path.join(self.workdir, "batch_job_distribution.json"), "r") as f:
            dct_batch_job_distribution = json.load(f)
        self.split_num = dct_batch_job_distribution["split_num"]
        self.ls_batch_input_files = dct_batch_job_distribution["ls_batch_input_files"]
        self.ls_batch_output_files = dct_batch_job_distribution["ls_batch_output_files"]

        # Get the current split index by checking which output files exist
        ls_split_batch_files = os.listdir(os.path.join(self.workdir, "split_batch"))
        ls_split_batch_files.sort()

        # Find the first split index that doesn't have an output file
        split_idx = 0
        while split_idx < self.split_num:
            if not os.path.exists(self.ls_batch_output_files[split_idx]):
                break
            split_idx += 1

        while split_idx < self.split_num:
            self._create_single_batch_job(split_idx, description=description)

            # Monitor the batch job status and download the output file when it is completed.
            # The next batch job can only be created after the previous batch job is completed.
            self.alfred(
                self.ls_batch_obj[split_idx].id,
                save_path=self.ls_batch_output_files[split_idx],
                workdir=self.workdir,
            )
            split_idx += 1

        # Concatenate the output files into a single file
        concat_jsonl(self.ls_batch_output_files, self.path_all_batch_output_file)

    def _validate_local_batch_input_file(self):
        """
        Validate the local batch input file
        """
        self._log(
            f"Validating the local batch input file: {self.path_all_batch_input_file}"
        )
        if not os.path.exists(self.path_all_batch_input_file):
            raise FileNotFoundError(
                f"File {self.path_all_batch_input_file} does not exist."
            )

        # Check the size of the batch input file
        if os.path.getsize(self.path_all_batch_input_file) > FILE_SIZE_LIMIT:
            # If the batch input file is too large, split the batch input file into multiple files.
            os.makedirs(self.path_dir_splits, exist_ok=True)
            self.split_num = split_jsonl_by_size(
                self.path_all_batch_input_file,
                self.path_dir_splits,
                FILE_SIZE_LIMIT,
            )
            self.ls_batch_input_files = [
                os.path.join(self.path_dir_splits, f"split_{i}.jsonl")
                for i in range(self.split_num)
            ]
            self.ls_batch_output_files = [
                os.path.join(self.path_dir_splits, f"split_{i}_output.jsonl")
                for i in range(self.split_num)
            ]
            dct_batch_job_distribution = {
                "split_num": self.split_num,
                "ls_batch_input_files": self.ls_batch_input_files,
                "ls_batch_output_files": self.ls_batch_output_files,
            }
            with open(
                os.path.join(self.workdir, "batch_job_distribution.json"), "w"
            ) as f:
                json.dump(dct_batch_job_distribution, f)
            self._log(
                f"Batch job distribution saved to {os.path.join(self.workdir, 'batch_job_distribution.json')}"
            )

            self.ls_batch_obj = [None for _ in range(self.split_num)]
            self._log(
                f"The local batch input file is split into {self.split_num} files."
            )
        else:
            self.split_num = 1
            self.ls_batch_input_files = [self.path_all_batch_input_file]
            self.ls_batch_output_files = [self.path_all_batch_output_file]
            self.ls_batch_obj = [None]
            self._log(
                "The local batch input file conforms to the size limit. Directly creating a single batch job."
            )

    def _generate_local_batch_input_file(self, save_path=None):
        """
        Step 1. Create a batch input file from the `self.__batch` list
        ---
        The batch input file is a JSONL file that contains the requests you want to make. Each line in the file is a separate request.
        """

        # To make sure the batch input file is valid, we encourage the user to use the default path.
        if save_path is None:
            save_path = self.path_all_batch_input_file
        else:
            self._log("[WARINING]: Unwilling to use the default path.")
            self._log(
                f"save_path is not None. The batch input file will be saved to {save_path}"
            )

        if not os.path.exists(os.path.dirname(save_path)):
            # If the upper level directory to save the file does not exist, create it.
            self._log("[WARINING]: The directory to save the file does not exist.")
            self._log(
                f"Directory {os.path.dirname(save_path)} does not exist. Creating it."
            )
            os.makedirs(os.path.dirname(save_path), exist_ok=True)

        if os.path.exists(save_path):
            # If the file already exists, raise an error.
            # This is to prevent overwriting the existing file.
            raise FileExistsError(
                f"File {save_path} already exists. Please choose a different name or delete the existing file."
            )

        # Save the batch input to a local file
        with open(save_path, "w") as f:
            for item in tqdm(self.__batch, desc="Generating batch input file"):
                json_line = json.dumps(item)
                f.write(json_line + "\n")
        self._log(f"Batch input file saved to {save_path}")

    def _create_batch_job(self, description=""):
        """Update the batch input file and create the batch job"""
        """
        Step 2. Upload your batch input file
        """

        client = openai.OpenAI()

        self._log(f"Uploading batch input file: {self.path_all_batch_input_file}")
        batch_input_file = client.files.create(
            file=open(self.path_all_batch_input_file, "rb"), purpose="batch"
        )

        self._log(str(batch_input_file))
        self.batch_input_file_obj = batch_input_file

        """
        Step 3. Create the batch
        ---
        Once you've successfully uploaded your input file, you can use the input File object's ID to create a batch. In this case, let's assume the file ID is file-abc123. For now, the completion window can only be set to 24h. You can also provide custom metadata via an optional metadata parameter.
        This request will return a Batch object with metadata about your batch:
        {
            "id": "batch_abc123",
            "object": "batch",
            "endpoint": "/v1/chat/completions",
            "errors": null,
            "input_file_id": "file-abc123",
            "completion_window": "24h",
            "status": "validating",
            "output_file_id": null,
            "error_file_id": null,
            "created_at": 1714508499,
            "in_progress_at": null,
            "expires_at": 1714536634,
            "completed_at": null,
            "failed_at": null,
            "expired_at": null,
            "request_counts": {
                "total": 0,
                "completed": 0,
                "failed": 0
            },
            "metadata": null
        }
        """

        batch_input_file_id = batch_input_file.id
        self.batch_input_file_id = batch_input_file_id

        batch_obj = client.batches.create(
            input_file_id=batch_input_file_id,
            endpoint=self.endpoint,
            completion_window="24h",
            metadata={"description": description},
        )
        self.batch_obj = batch_obj

        self._log(str(batch_obj))

        self.check_batch_status(batch_obj.id)

    def _create_single_batch_job(self, split_idx: int, description=""):
        """Update the batch input file and create the batch job"""
        """
        Step 2. Upload your batch input file
        """

        client = openai.OpenAI()

        path_input_file = self.ls_batch_input_files[split_idx]

        self._log(f"Uploading batch input file: {path_input_file}")
        batch_input_file = client.files.create(
            file=open(path_input_file, "rb"), purpose="batch"
        )

        self._log(f"Batch input file {split_idx} uploaded: {str(batch_input_file)}")

        """
        Step 3. Create the batch
        ---
        Once you've successfully uploaded your input file, you can use the input File object's ID to create a batch. In this case, let's assume the file ID is file-abc123. For now, the completion window can only be set to 24h. You can also provide custom metadata via an optional metadata parameter.
        This request will return a Batch object with metadata about your batch:
        {
            "id": "batch_abc123",
            "object": "batch",
            "endpoint": "/v1/chat/completions",
            "errors": null,
            "input_file_id": "file-abc123",
            "completion_window": "24h",
            "status": "validating",
            "output_file_id": null,
            "error_file_id": null,
            "created_at": 1714508499,
            "in_progress_at": null,
            "expires_at": 1714536634,
            "completed_at": null,
            "failed_at": null,
            "expired_at": null,
            "request_counts": {
                "total": 0,
                "completed": 0,
                "failed": 0
            },
            "metadata": null
        }
        """

        batch_obj = client.batches.create(
            input_file_id=batch_input_file.id,
            endpoint=self.endpoint,
            completion_window="24h",
            metadata={"description": description},
        )
        self._log(f"Batch job {split_idx} created: {str(batch_obj)}")

        self.ls_batch_obj[split_idx] = batch_obj

        # Check the status of the batch job
        cur_status = self.check_batch_status(batch_obj.id)
        # Print the time stamp and the batch job status
        status_msg = (
            "\n" + "=" * 20 + " Create Batch Job Sanity Check " + "=" * 20 + "\n"
        )
        status_msg += (
            f"Time stamp: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())}\n"
        )
        status_msg += f"Batch job ID: {batch_obj.id}\n"
        status_msg += f"Batch job status: {cur_status.status}\n"
        status_msg += f"Batch job full status:\n{cur_status}\n"
        status_msg += "-" * (40 + len(" Create Batch Job Sanity Check "))
        self._log(status_msg)

        return batch_obj

    @classmethod
    def alfred(cls, batch_obj_id: str, save_path: str = None, workdir: str = None):
        """
        I want to have a dead loop periodically check the status of the batch job.
        If the status is "completed", I want to download the output file.
        If the status is "failed", I want to print the error message.
        If the status is "expired", I want to print the error message.
        If the status is "cancelled", I want to print the error message.
        Args:
            batch_obj_id: The ID of the batch job.
            save_path: The path to save the output file. If not provided, this process will not be able to download the output file but only to monitor the status of the batch job.
            workdir: The directory to save the log file. If not provided, the log file will be saved to the same directory as the save_path.
            If both the save_path and workdir are not provided, there will be no log file.
        """

        def _get_sleep_time(alfred_iter: int, estimated_time_remaining: int = None):
            # Start with shorter intervals, then set the sleep time according to the estimated time remaining
            if alfred_iter <= 3:
                sleep_time = MINITES * 2  # 2 minutes for first 3 checks
                return sleep_time
            elif alfred_iter <= 6:
                sleep_time = MINITES * 5  # 5 minutes for next 3 checks
            else:
                if (
                    isinstance(estimated_time_remaining, int)
                    and estimated_time_remaining > 0
                ):
                    sleep_time = estimated_time_remaining // 10
                else:
                    if alfred_iter <= 10:
                        sleep_time = MINITES * 15  # 15 minutes for next 4 checks
                    else:
                        sleep_time = MINITES * 30  # 30 minutes after that

            # Clip the sleep time at 30 minutes and 3 minutes
            sleep_time = min(sleep_time, MINITES * 30)
            sleep_time = max(sleep_time, MINITES * 3)
            return sleep_time

        alfred_iter = 0

        assert isinstance(batch_obj_id, str), (
            f"batch_obj_id should be a string, but got {type(batch_obj_id)}"
        )

        # Determine the log file path for Alfred since it is a classmethod instead of an instance method.
        if workdir is not None and os.path.exists(workdir):
            alfred_log_path = os.path.join(workdir, "log.log")
        elif save_path is not None:
            alfred_log_path = save_path + ".log"
        else:
            alfred_log_path = None

        if alfred_log_path is not None:

            def _log(msg):
                print(msg)
                with open(alfred_log_path, "a") as f:
                    f.write(msg + "\n")
        else:

            def _log(msg):
                print(msg)

        while True:
            # Check the status of the batch job
            cur_status = cls.check_batch_status(batch_obj_id)

            num_completed = int(cur_status.request_counts.completed)
            num_failed = int(cur_status.request_counts.failed)
            num_total = int(cur_status.request_counts.total)
            num_remaining = num_total - num_completed - num_failed

            # Calculate the progress percentage
            progress_percentage = num_completed / num_total if num_total > 0 else 0

            # Calculate the estimated time remaining
            estimated_time_remaining = (
                (
                    num_remaining
                    / num_completed
                    * (time.time() - int(cur_status.in_progress_at))
                )
                if num_completed > 0
                else -1
            )
            estimated_time_remaining_str = (
                time.strftime("%H:%M:%S", time.gmtime(estimated_time_remaining))
                if estimated_time_remaining > 0
                else "N/A"
            )

            # Print the time stamp and the batch job status
            status_msg = "\n" + "=" * 20 + " Alfred " + "=" * 20 + "\n"
            status_msg += (
                f"Time stamp: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())}\n"
            )
            status_msg += f"Batch job ID: {batch_obj_id}\n"
            status_msg += f"Progress: {progress_percentage * 100:.2f}%\n"
            status_msg += f"Estimated time remaining: {estimated_time_remaining_str}\n"
            status_msg += f"Batch job has been running for: {time.strftime('%H:%M:%S', time.gmtime(time.time() - int(cur_status.in_progress_at)))}\n"
            status_msg += f"Batch job status: {cur_status.status}\n"
            status_msg += "---------------------\n"
            status_msg += f"Batch job full status:\n{cur_status}\n"
            status_msg += "-" * (40 + len("Alfred") + 2)

            _log(status_msg)

            # Check the status of the batch job
            if cur_status.status == "completed":
                msg = "Batch job completed."
                _log(msg)
                output_file_id = cur_status.output_file_id
                input(
                    f"Download the output file to {save_path}? Press Enter to continue..."
                )
                cls.download_file(output_file_id, save_path=save_path)
                break
            elif cur_status.status == "failed":
                msg = "Batch job failed."
                _log(msg)
                break
            elif cur_status.status == "expired":
                msg = "Batch job expired."
                _log(msg)
                break
            elif cur_status.status == "cancelled":
                msg = "Batch job cancelled."
                _log(msg)
                break

            # Get iteration count from local variable and sleep time
            sleep_time = _get_sleep_time(alfred_iter, estimated_time_remaining)
            alfred_iter += 1

            # Sleep for a specified time or manually interrupt the loop
            time.sleep(sleep_time)

    @classmethod
    def check_batch_status(cls, batch_obj_id):
        """Step 4. Check the status of a batch
        You can check the status of a batch at any time, which will also return a Batch object.
        The status of a given Batch object can be any of the following:

        Status	            Description
        ------------------	------------------------------------------------------
        validating	        the input file is being validated before the batch can begin
        failed	            the input file has failed the validation process
        in_progress	        the input file was successfully validated and the batch is currently being run
        finalizing	        the batch has completed and the results are being prepared
        completed	        the batch has been completed and the results are ready
        expired	            the batch was not able to be completed within the 24-hour time window
        cancelling	        the batch is being cancelled (may take up to 10 minutes)
        cancelled	        the batch was cancelled
        """
        client = openai.OpenAI()

        cur_status = client.batches.retrieve(batch_obj_id)
        return cur_status

    @classmethod
    def download_file(cls, file_id: str, save_path: str = "batch_output.jsonl"):
        """Step 5. Retrieve the results
        Once the batch is complete, you can download the output by making a request against the Files API via the output_file_id field from the Batch object and writing it to a file on your machine, in this case batch_output.jsonl
        """
        client = openai.OpenAI()

        file_response = client.files.content(file_id)
        # print(file_response.text)

        if os.path.exists(save_path):
            raise FileExistsError(
                f"File {save_path} already exists. Please choose a different name or delete the existing file."
            )
        elif not os.path.exists(os.path.dirname(save_path)):
            # If the upper level directory to save the file does not exist, create it.
            os.makedirs(os.path.dirname(save_path), exist_ok=True)

        # Save the file content to a local file
        with open(save_path, "w") as f:
            f.write(file_response.text)
        print(f"Batch output saved to {save_path}")

    @classmethod
    def cancel_batch(cls, batch_obj_id):
        """
        Chapter 6. Cancel a batch
        You can cancel a batch at any time, which will also return a Batch object.
        """
        client = openai.OpenAI()
        cur_status = client.batches.cancel(batch_obj_id)
        print(cur_status)

    @classmethod
    def list_batches(cls, status: str = None):
        """
        List all batches
        """
        client = openai.OpenAI()
        batches = client.batches.list()
        if status is not None:
            batches = [batch for batch in batches if batch.status == status]
        print(batches)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--alfred", "-a", action="store_true", required=False)
    parser.add_argument("--batch_obj_id", "-b", type=str, required=False, default=None)
    parser.add_argument("--save_path", "-s", type=str, required=False, default=None)

    parser.add_argument("--resume", "-r", action="store_true", required=False)
    parser.add_argument("--workdir", "-w", type=str, required=False, default=None)

    parser.add_argument("--list_in_progress", "-l", action="store_true", required=False)
    args = parser.parse_args()

    # Check only one of the alfred, resume, and list_in_progress is provided
    assert (
        (args.alfred and not args.resume and not args.list_in_progress)
        or (not args.alfred and args.resume and not args.list_in_progress)
        or (not args.alfred and not args.resume and args.list_in_progress)
    ), "Only one of the alfred, resume, and list_in_progress can be provided."

    if args.alfred:
        OpenAIBatchRunner.alfred(
            batch_obj_id=args.batch_obj_id, save_path=args.save_path
        )
    elif args.resume:
        OpenAIBatchRunner(model="gpt-4.1-nano", workdir=args.workdir).batch_run_resume()
    elif args.list_in_progress:
        OpenAIBatchRunner.list_batches(status="in_progress")

    # ## Examples
    # OpenAIBatchRunner.list_batches(status="in_progress")

    # OpenAIBatchRunner.alfred(
    #     batch_obj_id="batch_***", save_path="**/batch_output.jsonl"
    # )

    # OpenAIBatchRunner.cancel_batch(
    #     batch_obj_id="batch_***"
    # )
