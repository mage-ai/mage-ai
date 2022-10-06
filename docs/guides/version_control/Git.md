# Setting up Git on cloud

<img
  alt="GitHub"
  src="https://github.githubassets.com/images/modules/logos_page/Octocat.png"
  width="200"
/>

1. Open terminal
1. Configure Git
1. Set up SSH key
1. Add SSH key to GitHub profiles settings
1. Add github.com to known hosts

<br />

## 1. Open terminal

1. Open a pipeline
1. In the right panel of the screen (aka Sidekick), click on the tab named <b>Terminal</b>.
1. Click the terminal (large dark background area), and you should see a blinking cursor.
You can start typing once that cursor appears.

<br />

## 2. Configure Git

1. In the terminal, type the following command to set your user name:
    ```bash
    git config --global user.name "Your name here"
    ```
1. In the terminal, type the following command to set your email:
    ```bash
    git config --global user.email "your_email@example.com"
    ```

Optionally, you can configure Git further with these commands:

```bash
git config --global color.ui true
git config --global core.editor emacs
```

<br />

## 3. Set up SSH key

1. In the terminal, type the following command to create an
SSH key on the machine that’s running Mage:
    ```bash
    ssh-keygen -t rsa -C "your_email@example.com" -f ~/.ssh/id_rsa -N ""
    ```
1. Run the following command and copy the public SSH key (it’ll be used <ins></ins> the next section):
    ```bash
    cat ~/.ssh/id_rsa.pub
    ```
    It should look something like this:
    ```
    ssh-rsa alotofcharacters...morecharacters your_email@example.com
    ```

<br />

## 4. Add SSH key to GitHub profiles settings

1. Open your [GitHub profiles settings](https://github.com/settings/profile).
1. On the left hand side, click the section called <b>SSH and GPG keys</b>.
1. In the top left corner, click a button labeled <b>New SSH key</b>.
This will open a new form to create a new SSH key.
1. Enter in anything into the input field labeled <b>Title</b>. For example, `mage-cloud-key`.
1. Under the dropdown labeled <b>Key type</b>, select the `Authentication Key` option.
1. In the text area labeled <b>Key</b>, paste in the output text you copied after running the
command `cat ~/.ssh/id_rsa.pub` in your terminal.
1. Click the button labeled <b>Add SSH key</b>.

<br />

## 5. Add github.com to known hosts

1. In your terminal, run the following command to add github.com to known hosts:
    ```bash
    ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts
    ```

<br />

Now you can push your changes to a remote GitHub repository.
