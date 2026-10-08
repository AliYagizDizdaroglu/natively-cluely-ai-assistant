# Prep notes draft — the four recurrent gaps (after7/after8)

Paste-ready, first person, one paragraph each. Edit to match what you actually
did; the judge marked these four weak or wrong in both flights because the
model answered generically where a specific mechanism was expected.

## S3 pipe mode vs file mode (M14)

In SageMaker training, File mode copies the whole dataset from S3 to the
instance's local disk before the job starts, so start-up time and disk size
scale with the dataset. Pipe mode streams the data from S3 straight into the
training container through a named pipe, so training starts immediately, the
instance needs no disk for the data, and throughput is bounded by S3 rather
than the local volume. I use File mode for small or random-access datasets and
for frameworks that expect files on disk; I use Pipe mode (or Fast File mode,
which mounts S3 as a POSIX file system and reads lazily) for large sequential
datasets in RecordIO, TFRecord, or CSV, especially when I run many jobs over
the same data. The main constraints: Pipe mode reads each channel once in
order, needs shuffling done at the data level (for example ShuffleConfig), and
the container has to read from the pipe path rather than a file path.

## CloudFormation stacks, nested stacks, change sets (M21)

A stack is the unit of deployment: one template, one set of resources created,
updated, and deleted together, with rollback on failure. I split a platform
into several stacks by lifecycle, for example network, IAM and shared
services, then per-application stacks, and pass values between them with
exports/imports or parameters. Nested stacks let a parent template include
child templates as resources, which keeps a large system in one deploy while
reusing modules. For anything that changes production I create a change set
first, review exactly which resources will be added, modified, or replaced,
and only then execute it. StackSets deploy the same template across accounts
and regions. Drift detection compares the live resources with the template so
manual changes show up before the next update fails.

## Reconciling drift when a stack will not update (H09)

When someone changes a resource by hand and the stack update fails, I first
run drift detection to see exactly which properties differ. Then I choose one
of three paths: bring the resource back to the template (undo the manual
change), bring the template to the resource (update the template and run a
change set so the stack and reality agree), or, for resources CloudFormation
can no longer manage, import them with a resource import or retain them with a
DeletionPolicy and recreate cleanly. I never force the update by deleting
production resources. Afterwards I close the door that let the manual change
in, usually by restricting console permissions and putting the change through
the pipeline.

## CUDA base images for GPU serving (M08)

For a GPU model server I start from an image that matches the driver on the
host: an NVIDIA CUDA runtime image (for example the cuda runtime-ubuntu
variant, not the devel variant, to keep the image small) or the framework's
own GPU image such as the PyTorch or TensorFlow GPU tags, or the Triton
Inference Server image when I want batching and multi-model serving out of
the box. The CUDA version in the image has to be compatible with the host's
driver version; the container runtime needs the NVIDIA container toolkit; and
in Kubernetes the pod requests an nvidia.com/gpu resource and runs on a node
with the device plugin. I pin the CUDA, cuDNN, and framework versions, keep
the model weights out of the image, and use a multi-stage build so the build
tools do not ship in the runtime image.
