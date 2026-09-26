export function ComingSoon({ stage, description }: { stage: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed
      border-gray-300 px-4 py-10 text-center dark:border-gray-700">
      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{stage}</p>
      <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  )
}
