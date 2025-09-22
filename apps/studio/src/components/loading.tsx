const Loading = () => {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center h-12 w-12">
        <div className="absolute h-12 w-12 border-2 border-primary rounded-full animate-spin" 
             style={{
               borderTopColor: 'transparent',
               animationDuration: '1s'
             }}></div>
        <div className="absolute h-10 w-10 border-2 border-t-primary border-transparent rounded-full animate-spin" 
             style={{
               animationDuration: '0.8s',
               animationDirection: 'reverse'
             }}></div>
      </div>
      <p className="text-lg font-medium text-muted-foreground">
        Loading ...
      </p>
    </div>
  )
}

export default Loading
