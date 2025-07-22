# Personalized Chatbot

## Install Instructions (for dev)

### Step 0. Build the `conda` environment.

#### Method 1. Tested on Ubuntu 22.04
```bash
conda env create -f environment.yaml
conda activate langgraph
```

#### Method 2

```bash
conda create -n chatbot python=3.13
pip install -r requirements.txt
```

### Step 1. Create a `.env` file in the project **root directory** and put your `OPENAI_API_KEY` or `FORGE_KEY` in it.

```bash
vim .env
```

We recommend you to use [Froge by Tensorblock](https://forge.tensorblock.co/) so call large language models, which can switch to different LLMs by simply specifying a different `llm_model_name` when instantiating `PersonalizedChatbot`.

If not, simply put your `OPENAI_API_KEY` in the `.env` file so that the framework will automatically use the OpenAI client.

### Step 2. In the project home directory, build a terminal UI for the chatbot by running

```bash
python chatbot_terminal_ui.py -n <experiment_name>
```

The persona logs are stored in the `out` folder. When you use the same `<experiment_name>`, the chatbot will load all previous memory and allow you to resume the conversation. By default, the experiment name is `debug`.

You can create multiple experiments by specifying different `<experiment_name>`'s.
There are two examplify cases in the `patient_cases` folder for your reference.
