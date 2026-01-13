from setuptools import setup, find_packages

with open("requirements.txt") as f:
    install_requires = f.read().strip().split("\n")

setup(
    name="voice_note",
    version="1.0.0",
    description="Voice Channel - Team communication with voice notes, text notes, and todos",
    author="ITQAN LLC",
    author_email="info@itqan-kw.net",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=install_requires,
)
